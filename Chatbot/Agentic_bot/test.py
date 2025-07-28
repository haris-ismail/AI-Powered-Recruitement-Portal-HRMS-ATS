import os
from dotenv import load_dotenv
import pandas as pd
from langchain.text_splitter import RecursiveCharacterTextSplitter
# from langchain.embeddings import HuggingFaceEmbeddings
from langchain_huggingface import HuggingFaceEmbeddings

# from langchain_community.embeddings import HuggingFaceEmbeddings
# from langchain.vectorstores import SupabaseVectorStore
from langchain_community.vectorstores import SupabaseVectorStore
from langchain.schema import Document
from supabase import create_client
from sqlalchemy import create_engine

# Load environment  
load_dotenv()
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key)

# HRMS PostgreSQL connection
hrms_db_url = os.getenv("DATABASE_URL")
engine = create_engine(hrms_db_url)

# HuggingFace Embedding Model (your local folder path)
embedding_model = HuggingFaceEmbeddings(model_name="C:/Users/pc/OneDrive/Desktop/Haris Ismail/TalentTrackPro/NASTP_HRMS/Chatbot/huggingface_embeddings2")

# --- REPLACE CSV INGESTION WITH DB QUERIES ---
# jobs_df = pd.read_csv("D:/NASTP/Projects/Recruitment Web Application with AI/Agentic-RAG-Customer-Service-chatbot/chatbot/data/dummy_jobs.csv")
# applications_df = pd.read_csv("D:/NASTP/Projects/Recruitment Web Application with AI/Agentic-RAG-Customer-Service-chatbot/chatbot/data/dummy_applications.csv")
# candidates_df = pd.read_csv("D:/NASTP/Projects/Recruitment Web Application with AI/Agentic-RAG-Customer-Service-chatbot/chatbot/data/candidates.csv")

jobs_df = pd.read_sql("SELECT * FROM jobs", engine)
applications_df = pd.read_sql("SELECT * FROM applications", engine)
candidates_df = pd.read_sql("SELECT * FROM candidates", engine)

# print("jobs_df", jobs_df.head())
# print("applications_df", applications_df.head())
# print("candidates_df", candidates_df.head())

print("jobs_df columns:", jobs_df.columns.tolist())
print("jobs_df sample row:\n", jobs_df.iloc[0])

print("applications_df columns:", applications_df.columns.tolist())
print("applications_df sample row:\n", applications_df.iloc[0])

print("candidates_df columns:", candidates_df.columns.tolist())
print("candidates_df sample row:\n", candidates_df.iloc[0])

