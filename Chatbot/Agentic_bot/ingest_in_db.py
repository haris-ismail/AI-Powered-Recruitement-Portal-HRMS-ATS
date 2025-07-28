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


# Base custom context
# custom_data = """..."""  # (Same full NASTP data)

# Replace with your actual custom data (e.g. file load)
# ----------- 🧠 1. Split the custom data section-wise and add metadata -----------

custom_sections = {
    "about": """
Welcome to Nastp! We are a global leader in AI-driven software development, with a strong emphasis on innovation, learning, and diversity.

About:
National Aerospace Science and Technology Park (NASTP) will provide an ecosystem of essential elements required to nurture design, research, development and innovation in the aviation, space, IT and cyber domains.

NASTP is a pioneer organisation in Pakistan that is approved by the Government of Pakistan as ‘a project of strategic national importance’ led by the Pakistan Air Force. It aims to enable joint work between industry, academia and the government, turning it into a national technology ecosystem.
""",

    "mission": """
Mission:
Foster research, innovation & development in aviation, space, IT and cyber technologies, products and services to accrue maximum social, economic, security and scientific dividends for the country.
""",

    "vision": """
Vision:
Become one of the best Aerospace, Cyber & IT Clusters in the world and transform the national landscape with design, R&D and innovation centers for emerging and disruptive technologies.
""",

    "application_process": """
Application Process:
1. Submit your application via our Careers portal.
2. Complete a short assessment test (online, 30 minutes).
3. Technical interview with team lead (online or onsite).
4. Final HR interview discussing company culture, benefits, and expectations.
""",

    "work_environment": """
Work Environment:
- Hybrid and remote work options available.
- Slack is used for communication; Jira for task tracking.
- $1,000 annual learning budget per employee for certifications/courses.
""",

#     "faqs": """
# FAQs:
# - Do you sponsor work visas? Yes, for selected positions.
# - Are internships available? Yes, for students in their final year.
# - Common technologies used: Python, C++, JavaScript (React), MongoDB, PostgreSQL.
# """,

    "benefits": """
Company Benefits:
- Health insurance for employees and families.
- Flexible hours & work-from-home allowance.
- Performance-based bonuses & stock options.
- Paid parental leave and wellness programs.
"""
}

# ----------- 📄 Create Document objects with metadata -----------

documents = []

text_splitter = RecursiveCharacterTextSplitter(chunk_size=300, chunk_overlap=50)

for section_type, section_text in custom_sections.items():
    split_docs = text_splitter.create_documents([section_text])
    for doc in split_docs:
        doc.metadata = {"type": section_type}
        # doc.metadata = {"type": "company", "section": section_type}
        documents.append(doc)

# ----------- 💼 Ingest job records with improved metadata -----------

for _, row in jobs_df.iterrows():
    content = (
        f"Open Job Listing:\n"
        f"Title: {row['title']} (Job ID: {row['id']})\n"
        f"Department: {row['department']}\n"
        f"Experience Level: {row['experience_level']}\n"
        f"Required Skills: {row['required_skills']}\n"
        f"Description: {row['description']}\n"
        f"Job Status: {row['status']}\n"
        f"Location: {row['location']}\n"
        f"Salary (Min): {row['salary_min']}\n"
        # f"Field: {row['field']}\n"
        # f"Created At: {row['created_at']}\n"
    )
    documents.append(Document(
        page_content=content,
        metadata={
            "type": "job",
            "job_id": row["id"],
            "title": row["title"],
            "department": row["department"],
            "experience_level": row["experience_level"],
            "status": row["status"],
            "location": row["location"],
            "required_skills": row["required_skills"],
            "salary_min": row["salary_min"],
            # "field": row["field"],
            # "created_at": row["created_at"]
        }
    ))

# ----------- 📝 Ingest applications -----------

for _, row in applications_df.iterrows():
    content = (
        f"Application ID: {row['id']}\n"
        f"Job ID: {row['job_id']}\n"
        f"Candidate ID: {row['candidate_id']}\n"
        f"Status: {row['status']}\n"
        # f"Applied At: {row['applied_at']}\n"
        # f"Last Updated: {row['updated_at']}\n"
    )
    documents.append(Document(
        page_content=content,
        metadata={
            "type": "application",
            "application_id": row["id"],
            "job_id": row["job_id"],
            "candidate_id": row["candidate_id"],
            "status": row["status"],
            # "applied_at": row["applied_at"],
            # "updated_at": row["updated_at"]
        }
    ))

# ----------- 👤 Ingest candidates -----------

for _, row in candidates_df.iterrows():
    content = (
        f"Candidate ID: {row['id']}\n"
        # f"User ID: {row['user_id']}\n"
        f"CNIC: {row['cnic']}\n"
        # f"Profile Picture: {row['profile_picture']}\n"
        f"Name: {row['first_name']} {row['last_name']}\n"
        # f"Date of Birth: {row['date_of_birth']}\n"
        # f"Address: {row['apartment']}, {row['street']}, {row['area']}, {row['city']}, {row['province']}, {row['postal_code']}\n"
        # f"Resume URL: {row['resume_url']}\n"
        # f"Motivation Letter: {row['motivation_letter']}\n"
        f"Resume Text: {row['resume_text']}\n"
        # f"Created At: {row['created_at']}\n"
        # f"Updated At: {row['updated_at']}\n"
    )
    documents.append(Document(
        page_content=content,
        metadata={
            "type": "candidate",
            "candidate_id": row["id"],
            # "user_id": row["user_id"],
            "cnic": row["cnic"],
            # "profile_picture": row["profile_picture"],
            "first_name": row["first_name"],
            "last_name": row["last_name"],
            # "date_of_birth": row["date_of_birth"],
            # "apartment": row["apartment"],
            # "street": row["street"],
            # "area": row["area"],
            # "city": row["city"],
            # "province": row["province"],
            # "postal_code": row["postal_code"],
            # "resume_url": row["resume_url"],
            # "motivation_letter": row["motivation_letter"],
            "resume_text": row["resume_text"],
            # "created_at": row["created_at"],
            # "updated_at": row["updated_at"]
        }
    ))
# Store in Supabase vector store
SupabaseVectorStore.from_documents(
    documents,
    embedding_model,
    client=supabase,
    table_name="documents",         # your table name in Supabase
    query_name="match_documents",   # your vector search RPC/stored procedure name
    chunk_size=300,
)

