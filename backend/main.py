from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder
from dotenv import load_dotenv
from supabase import create_client
from langchain_groq import ChatGroq
from pydantic import BaseModel
from pinecone import Pinecone
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

# Connect to Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pinecone_index = pc.Index(os.getenv("PINECONE_INDEX"))

# Load Embedding Model
model = SentenceTransformer('all-MiniLM-L6-v2')

reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

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

@app.get("/contracts/{contract_id}")
def get_contract(contract_id: str):
    result = supabase.schema("project5").table("contracts").select("id", "name").eq("id", contract_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Contract not found")
    return result.data[0]

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
        }
        for chunk in chunks
    ]).execute()

    # Step 6: Save embeddings to Pinecone
    pinecone_index.upsert(
        vectors=[
            {
                "id": f"{contract_id}-{i}",
                "values": model.encode(chunk.page_content).tolist(),
                "metadata":{
                    "contract_id": contract_id,
                    "content": chunk.page_content
                }
            }
            for i, chunk in enumerate(chunks)
        ]
    )

    # Cleanup temp file
    os.unlink(tmp_path)

    return {
        "message": "Contract uploaded successfully",
        "contract_id" : contract_id,
        "chunks_created" : len(chunks)
    }

@app.post("/ask")
async def ask(request: AskRequest):

    # Ensure the conversation exists — stale localStorage sessions may reference a deleted row
    conv_check = supabase.schema("project5").table("conversations").select("id").eq("id", request.conversation_id).execute()
    if conv_check.data:
        conversation_id = request.conversation_id
    else:
        new_conv = supabase.schema("project5").table("conversations").insert({
            "contract_id": request.contract_id
        }).execute()
        conversation_id = new_conv.data[0]["id"]

    # Step 1: Convert question to embeddings
    embeddings = model.encode(request.question).tolist()

    # Step 2: Dense search — get more candidates (10 instead of 5)
    pinecone_results = pinecone_index.query(
        vector=embeddings,
        filter={"contract_id": request.contract_id},
        top_k=10,
        include_metadata=True
    )
    dense_chunks = [m["metadata"]["content"] for m in pinecone_results["matches"]]

    # Step 3: BM25 search — fetch all chunks for this contract from Supabase
    all_chunks_res = supabase.schema("project5").table("contract_chunks").select("content").eq("contract_id", request.contract_id).execute()
    all_texts = [c["content"] for c in all_chunks_res.data]
    tokenized = [t.lower().split() for t in all_texts]
    bm25 = BM25Okapi(tokenized)
    bm25_scores = bm25.get_scores(request.question.lower().split())
    top_bm25_indices = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)[:10]
    bm25_chunks = [all_texts[i] for i in top_bm25_indices]

    # Step 4: Merge — combine both lists, remove duplicates
    combined = list(dict.fromkeys(dense_chunks + bm25_chunks))

    # Step 5: Re-rank — score each chunk against the question then take top 5
    pairs = [[request.question, chunk] for chunk in combined]
    scores = reranker.predict(pairs)
    ranked = sorted(zip(scores, combined), reverse=True)
    context = "\n\n".join([chunk for _, chunk in ranked[:5]])

    # Step 6: Get past messages from Supabase for memory
    past_messages = supabase.schema("project5").table("messages").select("*").eq("conversation_id", conversation_id).execute()

    history = [{
        "role": "system",
        "content": """You are a legal document assistant helping non-lawyers understand contracts. Your sole purpose is to answer questions about the contract provided in the context. You must not answer questions about anything else.

        STRICT SCOPE RULE:
        If the user asks about anything not related to the contract — such as general knowledge, coding, recipes, news, other documents, or any topic outside the contract — do NOT answer the question. Instead, politely redirect them with a response like: "I can only help with questions about this contract. Is there something specific in the contract you'd like me to explain?"

        Always respond using markdown formatting:
        - Use ## headings when explaining different topics or sections
        - Use bullet points for lists of items, obligations, or conditions
        - **Bold** important legal terms, key amounts, deadlines, and critical information
        - Highlight critical clauses, penalties, or risk amounts clearly

        When answering contract questions:
        - Base your answer on the contract provided and always cite which part or section you are referencing
        - Explain WHY something is important, not just what it says — help the user understand the real-world impact
        - If a clause is risky or unusual, flag it clearly and explain what could go wrong
        - Use plain language that a non-lawyer can understand; define any legal jargon you use
        - If something is unclear in the contract, say so and explain what it might mean"""
            }]

    # Step 4: Format past messages for Groq
    for messages in past_messages.data:
        history.append({
            "role": messages["role"],
            "content": messages["content"]
        })

    

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
        "conversation_id": conversation_id,
        "role": "user",
        "content": request.question
    }).execute()

    supabase.schema("project5").table("messages").insert({
        "conversation_id": conversation_id,
        "role": "assistant",
        "content": ai_message
    }).execute()

    return {
        "answer": ai_message,
        "conversation_id": conversation_id,
        "sources": [chunk for _, chunk in ranked[:3]]
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
        "content": """You are a legal document analyst helping non-lawyers understand contracts. Use markdown formatting throughout your analysis.

        Structure your response exactly as follows:

        ## Summary
        A plain-language explanation of what this contract is about and its overall purpose.

        ## Parties Involved
        - **[Party Name]** — their role and what side of the agreement they are on

        ## Key Obligations
        List what each party must do, using bullet points with **bold labels**:
        - **[Party Name]:** obligation and why it matters

        ## Payment Terms
        - **Amount:** specify the exact figure
        - **Due Date / Schedule:** when payment is due and consequences of missing it
        - **Penalties:** any late fees, interest, or financial consequences

        ## Termination
        - **How to terminate:** steps required and notice period
        - **Consequences:** what happens to each party upon termination

        ## Red Flags
        List every concern in one section as bullet points. For each flag explain what it says and WHY it is dangerous or unusual:
        - **[Flag name]:** what the clause says and the real-world risk it creates for the reader

        ## Risky Clauses
        Quote specific sentences verbatim from the contract that carry legal or financial risk. Format each entry EXACTLY as shown — do not deviate from this format:
        - [HIGH] "exact quoted text from contract" — one sentence explaining the risk
        - [MEDIUM] "exact quoted text from contract" — one sentence explaining the concern
        - [LOW] "exact quoted text from contract" — one sentence explaining the minor concern
        Include 3–6 entries covering the most critical clauses. Only quote text that appears word-for-word in the contract.

        ## Risk Level
        State the overall risk as **Low**, **Medium**, or **High**, then explain in 2–3 sentences WHY it is that level — what specific clauses or missing protections drove that rating.

        Be specific and cite the exact sections or clause numbers where relevant."""
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
