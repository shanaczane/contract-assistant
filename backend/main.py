from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from supabase import create_client
from langchain_groq import ChatGroq
from pydantic import BaseModel
import tempfile
import os

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# Load Embedding Model
model = SentenceTransformer('all-MiniLM-L6-v2')

llm = ChatGroq(
    api_key=os.getenv("GROQ_API_KEY"),
    model="llama-3.3-70b-versatile",
    temperature=0
)

class AskRequest(BaseModel):
    contract_id: str
    conversation_id: str
    question: str

@app.get("/")
def read_root():
    return {"message": "Contract Assistant API is running!"}

@app.post("/upload-contract")
async def upload_contract(file: UploadFile =  File(...)):

    # Step 1: Save the uploaded PDF temporarily on the server
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        contents = await file.read()
        tmp.write(contents)
        tmp_path = tmp.name

    # Step 2: Read and extract from the file
    loader = PyPDFLoader(tmp_path)
    pages = loader.load()

    # Step 3: Split the text into chunks
    splitter = RecursiveCharacterTextSplitter (
        chunk_size = 500,
        chunk_overlap = 50 
    )

    chunks = splitter.split_documents(pages)

    # Step 4: Save Info to Supabase
    doc_response = supabase.schema("project5").table("contracts").insert({
        "name": file.filename,
    }). execute()

    contract_id = doc_response.data[0]["id"]
    
    # Step 5: Save all chunks in one bulk inset insteaf of one call per chunk
    supabase.schema("project5").table("contract_chunks").insert([
        {
            "contract_id": contract_id,
            "content": chunk.page_content,
            "embedding": model.encode(chunk.page_content).tolist()
        }
        for chunk in chunks
    ]).execute()

    # Cleanup temp file
    os.unlink(tmp_path)

    return {
        "message": "Contract uploaded successfully",
        "contract_id" : contract_id,
        "chunks_created" : len(chunks)
    }

