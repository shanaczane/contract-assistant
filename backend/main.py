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

class ConversationRequest(BaseModel):
    contract_id: str

class AnalyzeRequest(BaseModel):
    contract_id: str

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

@app.post("/ask")
async def ask(request: AskRequest):

    # Step 1: Convert question to embeddings
    embeddings = model.encode(request.question).tolist()

    # Step 2: Search contract chunks for relevant content
    results = supabase.schema("project5").rpc("match_contract_chunks", {
        "query_embedding": embeddings,
        "contract_id": request.contract_id,
        "match_count": 5
    }).execute()

    # Step 3: Get past messages from Supabase for memory
    past_messages = supabase.schema("project5").table("messages").select("*").eq("conversation_id", request.conversation_id).execute()

    history = [{
        "role": "system",
        "content": """
        You are a legal document assistant. 
        Answer questions based on the contract provided.
        If something is unclear or potentially risky, flag it.
        Always cite which part of the contract you're referencing."""
    }]

    # Step 4: Format past messages for Groq
    for messages in past_messages.data:
        history.append({
            "role": messages["role"],
            "content": messages["content"]
        })

    # Step 5: Add contract context
    context = "\n\n".join([r["content"] for r in results.data])

    # Step 6: Add new question with context
    history.append({
        "role": "user",
        "content": f"Context from contract:\n{context}\n\nQuestion: {request.question}"
    })

    # Step 7: Send to Groq then save to supabase
    response = llm.invoke(history)
    ai_message = response.content

    # Step 8: Save user and ai message to supabase
    supabase.schema("project5").table("messages").insert({
        "conversation_id": request.conversation_id,
        "role": "user",
        "content": request.question
    }).execute()

    
    supabase.schema("project5").table("messages").insert({
        "conversation_id": request.conversation_id,
        "role": "assistant",
        "content": ai_message
    }).execute()

    return {
        "answer": ai_message
    }

@app.post("/conversations")
def create_conversation(request: ConversationRequest):

    # Insert into supabase conversations
    response = supabase.schema("project5").table("conversations").insert({
        "contract_id": request.contract_id
    }).execute()

    return {
        "conversation_id": response.data[0]["id"]
    }

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):

    # Step 1: Get contract_chunks from supabase
    chunks = supabase.schema("project5").table("contract_chunks").select("content").eq("contract_id", request.contract_id).execute()

    # Step 2: Join all chunks into one big text
    full_text = "\n\n".join([c["content"]for c in chunks.data])

    # Step 3: Send full text to Groq and prompt instructions
    response = llm.invoke([
        {
        "role": "system",
        "content": """You are a legal document analyst.
        Analyze the contract and provide:
        1. Summary — what is this contract about?
        2. Parties involved — who is signing?
        3. Key obligations — what must each party do?
        4. Payment terms — money, deadlines, penalties
        5. Termination — how to end the contract
        6. Red flags — anything dangerous or unusual 
        7. Risk level — Low, Medium or High
        
        Be specific and cite the exact sections."""
        },
        {
            "role": "user",
            "content": f"Please analyze this contract: \n\n{full_text}"
        }
    ])

    # Step 4: Save analysis to Supabase
    supabase.schema("project5").table("contracts").update({
        "analysis": response.content
    }).eq("id", request.contract_id).execute()

    # Step 5: Return analysis
    return {
    "analysis": response.content
    }
