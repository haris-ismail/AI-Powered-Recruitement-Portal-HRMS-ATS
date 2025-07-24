"""
final version job match correct but still problem in mission vision statements.
"""

import os
import re
import streamlit as st
from dotenv import load_dotenv
import difflib
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import HumanMessage, AIMessage
import nltk
import os
from nltk.stem import WordNetLemmatizer
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain.memory import ConversationBufferMemory
from typing import Optional, Tuple, List
from langchain_core.documents import Document
import json


from supabase.client import create_client

# test code#

from pydantic import BaseModel

class RetrieveInput(BaseModel):
    input: str
    chat_history: str


# ------------------ Load Environment ------------------ #
load_dotenv()
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_KEY")
groq_api_key = os.environ.get("GROQ_API_KEY")

# ------------------ Setup Supabase Client ------------------ #
supabase = create_client(supabase_url, supabase_key)

# ------------------ Embeddings ------------------ #
embedding_model = HuggingFaceEmbeddings(
    model_name="C:/Users/pc/OneDrive/Desktop/Haris Ismail/TalentTrackPro/NASTP_HRMS/Chatbot/huggingface_embeddings2"
)


# ------------------ Vector Store ------------------ #
vector_store = SupabaseVectorStore(
    embedding=embedding_model,
    client=supabase,
    table_name="documents",
    query_name="match_documents"
)

# ------------------ NLTK Setup ------------------ #

# ---- Step 1: Local NLTK path ---- #
nltk_data_path = os.path.join(os.getcwd(), "nltk_data")
os.makedirs(nltk_data_path, exist_ok=True)
nltk.data.path.append(nltk_data_path)

# ---- Step 2: Download once if missing ---- #
# def download_if_missing(package):
#     try:
#         nltk.data.find(package)
#     except LookupError:
#         nltk.download(package.split("/")[-1], download_dir=nltk_data_path)

# download_if_missing("corpora/wordnet")
# download_if_missing("corpora/omw-1.4")

# ---- Step 3: Setup Lemmatizer ---- #
lemmatizer = WordNetLemmatizer()


# ------------------ Normalization Helper ------------------ #
# Step 2: Token normalization + lemmatization
def normalize(text):
    return re.sub(r"[^a-zA-Z0-9\s]", "", text.lower())

def lemmatize_tokens(text):
    tokens = normalize(text).split()
    return set(lemmatizer.lemmatize(token) for token in tokens)



# Step 3: Fuzzy match helper
def fuzzy_match(token_set, keyword_set, cutoff=0.8):
    for token in token_set:
        for keyword in keyword_set:
            score = difflib.SequenceMatcher(None, token, keyword).ratio()
            # print(f"[DEBUG][FUZZY] Comparing token '{token}' to keyword '{keyword}' | Similarity: {score}")
    #         if score >= cutoff:
    #             print(f"[DEBUG][FUZZY] --> MATCH: '{token}' matches '{keyword}' (score: {score})")
    #             return True
    # print(f"[DEBUG][FUZZY] No matches found for tokens {token_set} in keywords {keyword_set}")
    return False
# ------------------ Retriever Tool ------------------ #





# ------------------ Keyword Mapping ------------------ #
METADATA_KEYWORDS = {
    "job": {
        "keywords": {"job", "jobs", "position", "positions", "opening", "openings", "vacancy", "vacancies", "hiring", "career", "roles"},
        "intents": {"open", "available", "active", "current", "apply", "now", "accepting"}
    },
    "mission": {
        "keywords": {"mission", "purpose", "objective", "goal", "aim"},
    },
    "vision": {
        "keywords": {"vision","vission","vissions", "aspiration", "future", "direction", "dream"},
    },
    "application": {
        "keywords": {"application", "apply", "process", "submitted", "status", "steps", "procedure"},
    },
    "candidate": {
        "keywords": {"candidate", "applicant", "profile", "resume", "cv", "status", "info", "details"},
    },
    "benefits": {
        "keywords": {"benefits", "perks", "compensation", "incentives", "bonus", "insurance"},
    },
    "work_environment": {
        "keywords": {"environment", "culture", "workspace", "remote", "hybrid", "office", "tools", "communication"},
    },
    "about": {
        "keywords": {"about", "company", "organization", "overview", "introduction", "who"},
    },
    "faqs": {
        "keywords": {"faq", "faqs", "frequently", "question", "questions", "common"},
    }
}



import re

def extract_name_from_query(query):
    # Look for "my name is ..." or capitalized name patterns
    match = re.search(r"my name is ([A-Z][a-z]+(?: [A-Z][a-z]+)*)", query, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    # Fallback: look for two consecutive capitalized words
    tokens = query.split()
    for i in range(len(tokens) - 1):
        if tokens[i][0].isupper() and tokens[i+1][0].isupper():
            return f"{tokens[i]} {tokens[i+1]}"
    return None

class RetrieveHandler:
    def __init__(self, vector_store):
        self.vector_store = vector_store
        self.is_job_matching = False
        self.job_matching_data: Optional[Tuple[str, List[Document]]] = None

    def regular_search(self, query, tokens):
        """Handle regular document search"""
        # If we're in job matching mode and have data, return that instead
        if self.is_job_matching and self.job_matching_data:
            return self.job_matching_data
            
        # Skip search if query contains the name request message
        if NAME_REQUEST_MESSAGE.lower() in query.lower():
            return (NAME_REQUEST_MESSAGE, [])

        # Reset job matching state for non-job queries
        self.is_job_matching = False
        self.job_matching_data = None
        
        docs = self.vector_store.similarity_search(query, k=5)
        print("[DEBUG] Retrieved docs for query:", query)
        for i, doc in enumerate(docs):
            print(f"[DEBUG] Doc {i}: type={doc.metadata.get('type')}, content={doc.page_content[:200]}")

        all_filtered = []
        for meta_type, keyword_data in METADATA_KEYWORDS.items():
            keywords = keyword_data["keywords"]
            intents = keyword_data.get("intents", set())

            keyword_match = fuzzy_match(tokens, keywords)
            intent_match = fuzzy_match(tokens, intents) if intents else True

            if keyword_match and intent_match:
                st.session_state['last_type'] = meta_type
                if meta_type == "job":
                    filtered = [
                        doc for doc in docs
                        if doc.metadata.get("type") == "job" and "status: active" in doc.page_content.lower()
                    ]
                else:
                    filtered = [
                        doc for doc in docs
                        if doc.metadata.get("type") == meta_type
                    ]
                if filtered:
                    all_filtered.extend(filtered)

        if all_filtered:
            # Tokenize and lemmatize the query for better matching
            query_tokens = lemmatize_tokens(query)
            type_scores = []
            for meta_type, keyword_data in METADATA_KEYWORDS.items():
                keywords = set(keyword_data["keywords"])
                overlap = query_tokens & keywords
                if overlap:
                    type_scores.append((meta_type, len(overlap)))
            # Sort by most overlap
            type_scores.sort(key=lambda x: -x[1])
            if type_scores:
                # Only return the most relevant type(s)
                best_score = type_scores[0][1]
                best_types = [t for t, s in type_scores if s == best_score]
                filtered_docs = [doc for doc in all_filtered if doc.metadata.get("type") in best_types]
                if filtered_docs:
                    return "\n\n".join(f"{doc.metadata.get('type', '').title()}:\n{doc.page_content}" for doc in filtered_docs), filtered_docs
            # Otherwise, fallback to all_filtered
            return "\n\n".join(f"{doc.metadata.get('type', '').title()}:\n{doc.page_content}" for doc in all_filtered), all_filtered

        if 'last_type' in st.session_state and st.session_state['last_type'] == 'job':
            active_jobs = [
                doc for doc in docs
                if doc.metadata.get("type") == "job" and "status: active" in doc.page_content.lower()
            ]
            if active_jobs:
                return "\n\n".join(f"Source: {doc.metadata}\nContent: {doc.page_content}" for doc in active_jobs), active_jobs

        return "\n\n".join(f"Source: {doc.metadata}\nContent: {doc.page_content}" for doc in docs), docs

    def job_matching(self, name):
        """Handle job matching for a specific candidate"""
        self.is_job_matching = True
        
        # Split the name into first and last name
        first_name, *last_name_parts = name.split()
        
        # Search specifically for the candidate
        candidate_query = f"candidate: first_name = {first_name} AND last_name = {' '.join(last_name_parts)}"
        candidate_docs = self.vector_store.similarity_search(candidate_query, k=1)
        
        candidate_doc = None
        for doc in candidate_docs:
            if doc.metadata.get("type") == "candidate":
                full_name = f"{doc.metadata.get('first_name', '').strip()} {doc.metadata.get('last_name', '').strip()}".strip()
                if full_name.lower() == name.lower():
                    candidate_doc = doc
                    break
                    
        if not candidate_doc:
            self.is_job_matching = False
            return ("Please provide your full name so I can match you to available jobs.", [])
            
        # Get only active jobs
        jobs_query = "job: status = active"
        active_jobs = self.vector_store.similarity_search(jobs_query, k=10)
        active_jobs = [doc for doc in active_jobs if doc.metadata.get("type") == "job" and doc.metadata.get("status", "").lower() == "active"]
        
        # Format the data for the LLM
        try:
            resume_data = json.loads(candidate_doc.metadata.get('resume_text', '{}'))
            candidate_info = f"""
Candidate Profile:
Name: {candidate_doc.metadata.get('first_name')} {candidate_doc.metadata.get('last_name')}
Experience: {resume_data.get('summary', '')}
Skills: {', '.join(resume_data.get('skills', []))}

Available Jobs:
"""
        except json.JSONDecodeError:
            candidate_info = f"""
Candidate Profile:
Name: {candidate_doc.metadata.get('first_name')} {candidate_doc.metadata.get('last_name')}
Resume: {candidate_doc.metadata.get('resume_text')}

Available Jobs:
"""

        jobs_info = "\n".join([
            f"Job {i+1}:\n"
            f"Title: {job.metadata.get('title')}\n"
            f"Department: {job.metadata.get('department')}\n"
            f"Experience Level: {job.metadata.get('experience_level')}\n"
            f"Required Skills: {job.metadata.get('required_skills')}\n"
            f"Location: {job.metadata.get('location')}\n"
            for i, job in enumerate(active_jobs)
        ])

        formatted_content = candidate_info + jobs_info
        all_docs = [candidate_doc] + active_jobs
        
        # Store the job matching data
        self.job_matching_data = (formatted_content, all_docs)
        return self.job_matching_data

# Initialize the handler
retrieve_handler = RetrieveHandler(vector_store)

# Add a constant for the name request message
NAME_REQUEST_MESSAGE = "Please provide your full name so I can match you to available jobs."

@tool(response_format="content_and_artifact")
def retrieve(query: str):
    """Retrieve HR-related documents from NASTP vector database based on query."""
    
    tokens = lemmatize_tokens(query)

    # Check if this is a job matching query
    if any(kw in query.lower() for kw in [
        "good match", "match for", "jobs for me", "jobs i am a good fit","job i am a good fit", 
        "jobs i am a good match", "jobs that suit me", "jobs that fit me"
    ]):
        name = extract_name_from_query(query)
        if not name:
            st.session_state['stored_query'] = query
            return (NAME_REQUEST_MESSAGE, [])
        
        st.session_state['candidate_name'] = name
        return retrieve_handler.job_matching(name)
    
    # For all other queries
    return retrieve_handler.regular_search(query, tokens)



# ------------------ LLM Setup (Groq) ------------------ #
llm = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.0,
    api_key=groq_api_key
)



#ver3

prompt_template = ChatPromptTemplate.from_messages([
    ("system", 
     """
You are an AI HR Assistant for NASTP. Answer job-related queries using only the provided candidate and job data. Never answer from memory.



When you receive candidate and job data:
1. Analyze the candidate's skills and experience from their resume
2. Compare them with each job's required skills
3. Recommend jobs where there's a good match
4. Format your response as:

Based on your profile as a [candidate's role/experience], here are the jobs that match your skills:

• [Job Title] at [Department]
  - Required Skills: [skills]
  - Experience Level: [level]
  - Location: [location]
  [Add a brief note about why this is a good match]

For Regular Queries (About Company, Mission, Vision, etc.):
- Use the provided document content directly
- If not found, say: 'Based on the available information, I cannot find details about [topic].'
- Present information clearly and organized by type
- For multiple sections (mission, vision, etc.), use appropriate headers
- Keep the original content intact, just format it clearly
General Rules:
- Always call retrieve tool first UNLESS you already have candidate and job data for matching.
- If info is missing, reply: "I can't answer your question, you can contact customer support at cus.supp.nastp.com.pk"
- Keep metadata sections separate in replies. Don't merge into one paragraph.
- For queries about "available", "open", or "current" jobs: list only jobs with status = active.
- Never show job IDs in any response.
- Only mention salary if asked explicitly and data exists.
- For follow-ups (e.g. experience levels), match job titles like:
  - Job A requires entry level.
  - Job B requires mid level.
- For "my application", "application status", or "application update" queries, say:
  "You can view your application status at the NASTP portal (www.nastp.jobs.com). For any issues, please contact the HR team at www.nastp.customer_support.com."
     """),
    ("user", "Conversation so far:\n{chat_history}\n\nUser Query:\n{input}"),
    ("placeholder", "{agent_scratchpad}")
])


# When a user asks for multiple types of information (such as mission, vision, and about, etc), always include all relevant sections in your answer. 
# Format your response using clear section headers, like this:

# Mission:
# ...

# Vision:
# ...

# About:
# ...

# ------------------ Agent and Executor ------------------ #
tools = [retrieve]
memory = ConversationBufferMemory(
    memory_key="chat_history",  # must match prompt input
    return_messages=True
)

agent = create_tool_calling_agent(llm=llm, tools=tools, prompt=prompt_template)
agent_executor = AgentExecutor(agent=agent, tools=tools, memory=memory,verbose=True)

# ------------------ Streamlit UI ------------------ #
st.set_page_config(page_title="NASTP HR Assistant", page_icon="🛩️")
st.title("🛩️ NASTP AI Assistant")

if "messages" not in st.session_state:
    st.session_state.messages = []

for msg in st.session_state.messages:
    with st.chat_message("user" if isinstance(msg, HumanMessage) else "assistant"):
        st.markdown(msg.content)

user_input = st.chat_input("Ask a question about jobs, candidates, or applications...")

# --- Combine stored query and name if needed ---
if 'stored_query' in st.session_state and st.session_state['stored_query']:
    name = extract_name_from_query(user_input)
    if name:
        # Save the name for future use
        st.session_state['candidate_name'] = name
        # Combine the stored query and the name
        user_input = f"{st.session_state['stored_query']} My name is {name}"
        st.session_state['stored_query'] = ''

if user_input:
    with st.chat_message("user"):
        st.markdown(user_input)
    st.session_state.messages.append(HumanMessage(content=user_input))

    try:
        # If we're in job matching mode, use the stored data
        if retrieve_handler.is_job_matching and retrieve_handler.job_matching_data:
            result = agent_executor.invoke({
                "input": user_input,
                "chat_history": memory.buffer
            })
            response = result["output"]
        else:
            # Regular query processing
            PRONOUNS = {"their", "these", "it", "its", "those", "them"}

        def contains_pronoun(query):
            tokens = set(normalize(query).split())
            return any(pronoun in tokens for pronoun in PRONOUNS)

        if contains_pronoun(user_input) and 'last_type' in st.session_state:
            augmented_query = f"{st.session_state['last_type']} {user_input}"
        else:
            augmented_query = user_input

        print("[DEBUG] Input to agent_executor.invoke():")
        print({
            "input": augmented_query,
            "chat_history": memory.buffer
        })

        retrieve_output = retrieve(augmented_query)
        if isinstance(retrieve_output, tuple):
            retrieve_result, retrieve_docs = retrieve_output
        else:
            retrieve_result = retrieve_output
            retrieve_docs = []

        if retrieve_result.strip() == NAME_REQUEST_MESSAGE:
            response = NAME_REQUEST_MESSAGE
        else:
            # For regular queries, pass the formatted content as the LLM's context
            result = agent_executor.invoke({
                "input": retrieve_result,  # Pass the formatted content, not the user query
                "chat_history": memory.buffer
            })
            response = result["output"]

        with st.chat_message("assistant"):
            st.markdown(response)

        st.session_state.messages.append(AIMessage(content=response))

    except Exception as e:
        st.error(f"Error: {e}")
        retrieve_handler.is_job_matching = False  # Reset on error
