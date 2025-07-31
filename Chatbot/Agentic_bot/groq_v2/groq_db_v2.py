'''
Working Groq DB v1(backup): Groq Agentic Chatbot with parallel Agents (tool) calling, error handling, and structured output.
Groq DB v2 current
currently implemented 
functionalites:
1. normal chat, small talk (done).
2. match candidates to job profile

Agents (tools):
1. get_active_jobs_from_postgresql
2. get_company_info_from_postgresql
3. get_candidate_from_postgresql
4. match_candidates_to_jobs_from_postgresql
5. get_candidate_status_from_postgresql

to do:
1. Conversation history(works for all scenarios)
    but not done as chat respnse type but simple hardocoded scenarios.




'''

import os
import logging
import json
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from groq import Groq
import instructor
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import numpy as np
import datetime

# ================== ENVIRONMENT & ENGINE SETUP =====================
load_dotenv()

hrms_db_url = os.environ.get("DATABASE_URL")
if not hrms_db_url:
    raise ValueError("DATABASE_URL not set in environment.")
engine = create_engine(hrms_db_url)

# ================== LOGGING SETUP =====================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ================== GROQ CLIENTS =====================
client = Groq()
instructor_client = instructor.from_groq(Groq(), mode=instructor.Mode.JSON)

# ================== TOOL FUNCTIONS =====================
def get_active_jobs_from_postgresql() -> Dict[str, Any]:
    """Fetch up to 10 currently active job listings from the HRMS PostgreSQL database. Use this tool when the user asks about available jobs, job openings, or current positions at NASTP. Returns a list of jobs with title, department, experience level, required skills, description, status, location, and salary_min. If no jobs are found, returns an empty list."""
    try:
        query = "SELECT * FROM jobs WHERE status = 'active' LIMIT 10"
        df = pd.read_sql(query, engine)
        # Drop 'created_at' column if it exists
        if 'created_at' in df.columns:
            df = df.drop(columns=['created_at'])
                # Drop 'created_at' column if it exists
        if 'assessment_template_id' in df.columns:
            df = df.drop(columns=['assessment_template_id'])
        jobs = df.to_dict(orient="records")
        return {"jobs": jobs, "is_error": False}
    except Exception as e:
        logger.error(f"Error fetching active jobs: {e}")
        return {"jobs": [], "is_error": True, "error": str(e)}

def get_company_info_from_postgresql(section_names: List[str]) -> Dict[str, Any]:
    """Fetch company information sections (e.g., mission, vision, benefits, about, work environment, faqs) from the HRMS PostgreSQL database. Use this tool when the user asks about company mission, vision, benefits, or similar. Accepts a list of section names (case-insensitive). Returns a list of dicts with section_name and content. If no info is found, returns an empty list."""
    try:
        if isinstance(section_names, str):
            section_names = [section_names]
        placeholders = ','.join(['%s'] * len(section_names))
        query = f"SELECT section_name, content FROM company_info WHERE LOWER(section_name) IN ({placeholders})"
        params = tuple([s.lower() for s in section_names])
        df = pd.read_sql(query, engine, params=params)
        info = df.to_dict(orient="records")
        return {"company_info": info, "is_error": False}
    except Exception as e:
        logger.error(f"Error fetching company info: {e}")
        return {"company_info": [], "is_error": True, "error": str(e)}

def get_candidate_from_postgresql(first_name: str, last_name: str) -> Dict[str, Any]:
    """Fetch a candidate's profile from the HRMS PostgreSQL database by first and last name (case-insensitive). Use this tool when the user asks about a specific candidate or their own application/profile. Returns a dict with candidate info if found, else an empty dict."""
    try:
        query = "SELECT id,user_id,cnic,first_name,last_name,resume_text FROM candidates WHERE LOWER(first_name) = %s AND LOWER(last_name) = %s LIMIT 1"
        params = (first_name.lower(), last_name.lower())
        df = pd.read_sql(query, engine, params=params)
        # Drop 'created_at' column if it exists
        if 'created_at' in df.columns:
            df = df.drop(columns=['created_at'])
                # Drop 'created_at' column if it exists
        if 'updated_at' in df.columns:
            df = df.drop(columns=['updated_at'])
        if not df.empty:
            return {"candidate": df.iloc[0].to_dict(), "is_error": False}
        else:
            return {"candidate": {}, "is_error": False}
    except Exception as e:
        logger.error(f"Error fetching candidate: {e}")
        return {"candidate": {}, "is_error": True, "error": str(e)}

def match_candidates_to_jobs_from_postgresql(first_name: str, last_name: str) -> Dict[str, Any]:
    """
    Fetch a candidate's profile and all active jobs from the HRMS PostgreSQL database.
    Returns both candidate data and active jobs for the AI to analyze and suggest the best job matches.
    Use this tool when the user asks about job recommendations for a specific candidate.
    """
    try:
        # Handle multi-word names by trying different combinations
        full_name = (first_name + " " + last_name).strip()
        name_parts = full_name.split()
        
        # Check if name is too short or incomplete
        if len(name_parts) < 2:
            return {
                "candidate": {},
                "active_jobs": [],
                "is_error": True,
                "error": f"Please provide the full name (first and last name) to match you with available jobs. You provided: '{full_name}'"
            }
        
        # Check if the name contains pronouns or invalid terms
        pronoun_list = ['me', 'myself', 'i', 'my', 'mine', 'you', 'your', 'yours', 'he', 'she', 'they', 'them', 'their', 'his', 'her']
        if any(part.lower() in pronoun_list for part in name_parts):
            return {
                "candidate": {},
                "active_jobs": [],
                "is_error": True,
                "error": f"Please provide a complete name (first and last name) to match you with available jobs. You provided: '{full_name}'"
            }
        
        # Check if the name parts seem incomplete (e.g., "User" as last name)
        if last_name.lower() in ['user', 'unknown', 'n/a', 'none', ''] or first_name.lower() in ['user', 'unknown', 'n/a', 'none', '']:
            return {
                "candidate": {},
                "active_jobs": [],
                "is_error": True,
                "error": f"Please provide a complete name (first and last name) to match you with available jobs. You provided: '{full_name}'"
            }
        
        # Try different combinations of name parts
        name_combinations = []
        
        # If we have 2 parts, use as is
        if len(name_parts) == 2:
            name_combinations.append((name_parts[0], name_parts[1]))
        
        # If we have 3 parts, try different splits
        elif len(name_parts) == 3:
            # Try: First + Middle as first name, Last as last name
            name_combinations.append((name_parts[0] + " " + name_parts[1], name_parts[2]))
            # Try: First as first name, Middle + Last as last name
            name_combinations.append((name_parts[0], name_parts[1] + " " + name_parts[2]))
            # Try: First + Middle as first name, Last as last name (same as first, but explicit)
            name_combinations.append((name_parts[0] + " " + name_parts[1], name_parts[2]))
        
        # If we have more than 3 parts, try reasonable splits
        elif len(name_parts) > 3:
            # Try: First as first name, rest as last name
            name_combinations.append((name_parts[0], " ".join(name_parts[1:])))
            # Try: First two as first name, rest as last name
            name_combinations.append((" ".join(name_parts[:2]), " ".join(name_parts[2:])))
            # Try: All but last as first name, last as last name
            name_combinations.append((" ".join(name_parts[:-1]), name_parts[-1]))
        
        # Remove duplicates while preserving order
        seen = set()
        unique_combinations = []
        for combo in name_combinations:
            if combo not in seen:
                seen.add(combo)
                unique_combinations.append(combo)
        
        candidate = None
        used_first_name = None
        used_last_name = None
        
        # Try each combination until we find a match
        for first, last in unique_combinations:
            candidate_query = "SELECT id,user_id,cnic,first_name,last_name,resume_text FROM candidates WHERE LOWER(first_name) = %s AND LOWER(last_name) = %s LIMIT 1"
            candidate_params = (first.lower(), last.lower())
            candidate_df = pd.read_sql(candidate_query, engine, params=candidate_params)
            
            if not candidate_df.empty:
                candidate = candidate_df.iloc[0].to_dict()
                used_first_name = first
                used_last_name = last
                break
        
        if candidate is None:
            return {
                "candidate": {},
                "active_jobs": [],
                "is_error": True,
                "error": f"Candidate '{full_name}' not found in our database. Please provide the correct full name (first and last name) to match you with available jobs."
            }
        
        candidate = candidate_df.iloc[0].to_dict()
        # Drop 'created_at' column if it exists
        if 'created_at' in candidate_df.columns:
            candidate_df = candidate_df.drop(columns=['created_at'])
        # Drop 'updated_at' column if it exists
        if 'updated_at' in candidate_df.columns:
            candidate_df = candidate_df.drop(columns=['updated_at'])
        
        # Directly fetch active jobs
        jobs_query = "SELECT * FROM jobs WHERE status = 'active' LIMIT 10"
        jobs_df = pd.read_sql(jobs_query, engine)
        
        # Clean up jobs data
        if 'created_at' in jobs_df.columns:
            jobs_df = jobs_df.drop(columns=['created_at'])
        if 'assessment_template_id' in jobs_df.columns:
            jobs_df = jobs_df.drop(columns=['assessment_template_id'])
        
        jobs = jobs_df.to_dict(orient="records")

        return {
            "candidate": candidate,
            "active_jobs": jobs,
            "matched_name": f"{used_first_name} {used_last_name}",
            "is_error": False
        }
    except Exception as e:
        logger.error(f"Error fetching candidate and jobs data: {e}")
        return {
            "candidate": {},
            "active_jobs": [],
            "is_error": True,
            "error": str(e)
        }

def get_candidate_status_from_postgresql(first_name: str, last_name: str) -> Dict[str, Any]:
    """Fetch application status, job title, and candidate name for a specific candidate from the HRMS PostgreSQL database. Returns a list of dicts with application_id, job_id, candidate_id, candidate_name, job_title, and status. Use this tool to get the current status of all applications for a specific candidate."""
    try:
        # Try multiple name matching strategies
        full_name = f"{first_name} {last_name}".strip()
        
        query = '''
            SELECT
                a.id AS application_id,
                a.job_id,
                a.candidate_id,
                c.first_name || ' ' || c.last_name AS candidate_name,
                j.title AS job_title,
                a.status
            FROM
                applications a
            JOIN
                jobs j ON a.job_id = j.id
            JOIN
                candidates c ON a.candidate_id = c.id
            WHERE 
                LOWER(c.first_name || ' ' || c.last_name) = LOWER(%s)
                OR (LOWER(c.first_name) = LOWER(%s) AND LOWER(c.last_name) = LOWER(%s))
                OR LOWER(c.first_name || ' ' || c.last_name) LIKE LOWER(%s);
        '''
        # Try exact match first, then partial match
        params = (full_name, first_name, last_name, f"%{full_name}%")
        df = pd.read_sql(query, engine, params=params)
        
        if df.empty:
            # If no results, try with just the first name
            simple_query = '''
                SELECT
                    a.id AS application_id,
                    a.job_id,
                    a.candidate_id,
                    c.first_name || ' ' || c.last_name AS candidate_name,
                    j.title AS job_title,
                    a.status
                FROM
                    applications a
                JOIN
                    jobs j ON a.job_id = j.id
                JOIN
                    candidates c ON a.candidate_id = c.id
                WHERE LOWER(c.first_name) LIKE LOWER(%s);
            '''
            df = pd.read_sql(simple_query, engine, params=(f"%{first_name}%",))
        
        results = df.to_dict(orient="records")
        return {"candidate_status": results, "is_error": False}
    except Exception as e:
        logger.error(f"Error fetching candidate status: {e}")
        return {"candidate_status": [], "is_error": True, "error": str(e)}

# ================== TOOL SCHEMAS =====================
db_tools = [
    {
        "type": "function",
        "function": {
            "name": "get_active_jobs_from_postgresql",
            "description": "Fetch up to 10 currently active job listings from the HRMS PostgreSQL database. Use this tool when the user asks about available jobs, job openings, or current positions at NASTP. Returns a list of jobs with title, department, experience level, required skills, description, status, location, and salary_min. If no jobs are found, returns an empty list.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_company_info_from_postgresql",
            "description": "Fetch company information sections (e.g., mission, vision, benefits, about, work environment, faqs) from the HRMS PostgreSQL database. Use this tool when the user asks about company mission, vision, benefits, or similar. Accepts a list of section names (case-insensitive). Returns a list of dicts with section_name and content. If no info is found, returns an empty list.",
            "parameters": {
                "type": "object",
                "properties": {
                    "section_names": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of section names to fetch (e.g., ['mission', 'vision', 'benefits'])"
                    }
                },
                "required": ["section_names"]
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_candidate_from_postgresql",
            "description": "Fetch a candidate's profile from the HRMS PostgreSQL database by first and last name (case-insensitive). Use this tool when the user asks about a specific candidate or their own application/profile. Returns a dict with candidate info if found, else an empty dict.",
            "parameters": {
                "type": "object",
                "properties": {
                    "first_name": {"type": "string", "description": "Candidate's first name"},
                    "last_name": {"type": "string", "description": "Candidate's last name"}
                },
                "required": ["first_name", "last_name"]
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "match_candidates_to_jobs_from_postgresql",
            "description": "Fetch a candidate's profile and all active jobs from the HRMS PostgreSQL database. Returns both candidate data and active jobs for the AI to analyze and suggest the best job matches. Use this tool when the user asks about job recommendations for a specific candidate.",
            "parameters": {
                "type": "object",
                "properties": {
                    "first_name": {"type": "string", "description": "Candidate's first name"},
                    "last_name": {"type": "string", "description": "Candidate's last name"}
                },
                "required": ["first_name", "last_name"]
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_candidate_status_from_postgresql",
            "description": "Fetch application status, job title, and candidate name for a specific candidate from the HRMS PostgreSQL database. Returns a list of dicts with application_id, job_id, candidate_id, candidate_name, job_title, and status. Use this tool to get the current status of all applications for a specific candidate.",
            "parameters": {
                "type": "object",
                "properties": {
                    "first_name": {"type": "string", "description": "Candidate's first name"},
                    "last_name": {"type": "string", "description": "Candidate's last name"}
                },
                "required": ["first_name", "last_name"]
            },
        },
    },
]

# ================== TOOL MAPPING =====================
available_functions = {
    "get_active_jobs_from_postgresql": get_active_jobs_from_postgresql,
    "get_company_info_from_postgresql": get_company_info_from_postgresql,
    "get_candidate_from_postgresql": get_candidate_from_postgresql,
    "match_candidates_to_jobs_from_postgresql": match_candidates_to_jobs_from_postgresql,
    "get_candidate_status_from_postgresql": get_candidate_status_from_postgresql,
}

# ================== ERROR HANDLING =====================
class GroqAPIError(Exception):
    def __init__(self, message, status_code=None, failed_generation=None):
        self.message = message
        self.status_code = status_code
        self.failed_generation = failed_generation
        super().__init__(self.message)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=5),
    retry=retry_if_exception_type((GroqAPIError, Exception)),
    before_sleep=lambda retry_state: logger.warning(f"Retry attempt {retry_state.attempt_number} after error: {retry_state.outcome.exception()}")
)
def execute_groq_request_with_retry(messages: List[Dict], tools: List[Dict], model: str = "llama-3.1-8b-instant") -> Dict:
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=tools,
            temperature=0.4,
            max_completion_tokens=1000,
        )
        return response
    except Exception as e:
        error_message = str(e)
        logger.error(f"Groq API error: {error_message}")
        if "400" in error_message and ("failed_generation" in error_message.lower() or "tool call" in error_message.lower()):
            raise GroqAPIError(
                f"Groq API tool call generation failed: {error_message}",
                status_code=400,
                failed_generation=error_message
            )
        elif "429" in error_message:
            logger.warning("Rate limit hit, waiting before retry")
            raise GroqAPIError(
                f"Groq API rate limit: {error_message}",
                status_code=429
            )
        else:
            raise e

# ================== TOOL EXECUTION =====================
def execute_tools_parallel(tool_calls: List) -> List[Dict[str, Any]]:
    results = []
    for tool_call in tool_calls:
        try:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)
            print(f"DEBUG: Function: {function_name}, Args: {function_args}, Type: {type(function_args)}")
            
            if function_name in available_functions:
                function_to_call = available_functions[function_name]
                # Fix: If function_args is None or empty, call with no args
                if not function_args:
                    print(f"DEBUG: Calling {function_name} with no arguments")
                    function_response = function_to_call()
                else:
                    print(f"DEBUG: Calling {function_name} with arguments: {function_args}")
                    function_response = function_to_call(**function_args)
                results.append({
                    "tool_call": tool_call,
                    "result": function_response,
                    "success": not function_response.get("is_error", False)
                })
            else:
                print(f"DEBUG: Unknown function: {function_name}")
                results.append({
                    "tool_call": tool_call,
                    "result": {"error": f"Unknown function: {function_name}", "is_error": True},
                    "success": False
                })
        except Exception as e:
            print(f"DEBUG: Error in execute_tools_parallel: {type(e).__name__}: {str(e)}")
            print(f"DEBUG: Tool call: {tool_call}")
            print(f"DEBUG: Function name: {tool_call.function.name}")
            print(f"DEBUG: Function arguments: {tool_call.function.arguments}")
            logger.error(f"Error executing tool {tool_call.function.name}: {e}")
            results.append({
                "tool_call": tool_call,
                "result": {"error": str(e), "is_error": True},
                "success": False
            })
    return results

# ================== SYSTEM PROMPT =====================
system_prompt = (
    """
Important: For normal conversation or chat messages (such as greetings(hi , hello, how are you, etc), small talk, or general questions), and for any queries that do not match the types handled by the defined tools, you should answer directly from your own knowledge base as NASTP's AI HR assistant, without using any tools.

You are an AI HR Assistant for NASTP. You MUST answer queries using ONLY the provided tools if query type matches the tool. 
NEVER hallucinate or make up information when tools are used(for that query type). Use the tools to fetch jobs, company info, or candidate info as needed. If no info is found by tool, say so. Also for other type of queries which tools is not defined for, you can answer the query using your knowledge base.

For Job Queries(Active/ available/ current Jobs): Use the get_active_jobs_from_postgresql tool. dont mention job ids in response, and dont assume any currency of salary when giving response, as it is not provided in database.
For Company Info (mission, vision, benefits, about, work_environment(culture), faqs,application_process): Use get_company_info_from_postgresql. Remember to use the correct section names as given previously. faqs is for frequently asked questions.
For Candidate Info: Use get_candidate_from_postgresql.
For Candidate-Job Matching: Use match_candidates_to_jobs_from_postgresql. Dont mention Job ids when giving response. First check if any retrived acitve jobs match canddiate profile then suggest only active ones dont hallucinate, otherwise give job recommendations based on candidates resume, experience, skill etc. 
For Candidate Application Status/Updates: Use get_candidate_status_from_postgresql. Only use this tool if a full name (first and last) is provided in the current query for this type of questions(like asking about applied jobs application status) or is the latest full name in chat history. If not, ask the user to provide their full name. dont mention application ids in response.

For both Candidate-Job Matching and Candidate Application Status/Updates: 
    IMPORTANT: When extracting names from queries, make sure to get the COMPLETE full name (first and last name). If the query only mentions a first name (like "Awais" or "John"), ask the user to provide their full name. Do not use generic terms like "User" as last name.
    
    CRITICAL NAME HANDLING RULES:
    - If the current query contains a full name (first and last), use that name.
    - If the current query uses pronouns like "me", "my", "I", "myself", etc., then:
        * Look through the conversation history for the most recent full name (first and last) that was mentioned
        * Use that name from conversation history
        * Do NOT try to extract a new name from the current pronoun-based query
        * If no full name is found in conversation history, ask the user to provide their full name
    - Never assume or guess names based on any context other than the latest full name explicitly provided by the user in the chat history.
    - If multiple names have been mentioned previously, always use the most recent one.
    - If no full name is available, do not proceed—ask the user for their full name.

If a tool returns no data u can call that tool again upto 5 times, if still no data is found, say: 'I don't have information on that.(for that query type) based on information from database'. Never say based on information provied by tool or similar, replace tool with agent or database.
also if this error occurs:
    ERROR:__main__:Unexpected error: 'NoneType' object is not iterable
    ❌ Error: 'NoneType' object is not iterable
    then try to call the tool again with different section names, at leats 5 times. if still no data is found, say: 'I don't have information on that.'(for that query type).

NEVER generate SQL queries or make up job listings, candidate profiles, or company information.

Also, format your response in markdown format, in presentable manner not write what was recvived from tool as it is.
"""
)
    # CRITICAL: If no name is given but pronouns like "me", "I am", "my", "myself" etc are used in a Candidate-Job Matching query, DO NOT try to extract or guess any name. Instead, first check if in caht history(context) is there any candidate name/names present, use the latest one otherwise ask the user to provide their full name (first and last name) so you can match them with available jobs. Never hallucinate names.
    
# ================== REFINED NAME CONTEXT RULE =====================
refined_name_context_rule = (
    """
    For Candidate-Job Matching queries, ONLY use a candidate's name if it is:
    - Explicitly mentioned in the current user query, OR
    - The most recent full name (first and last) provided by the user in the conversation history.

    If the current query uses pronouns like \"me\", \"my\", \"I\", etc., and no full name has been provided earlier in the conversation, ALWAYS ask the user to provide their full name (first and last name).
    Never assume or guess names based on any context other than the latest full name explicitly provided by the user in the chat history.
    If multiple names have been mentioned previously, always use the most recent one.
    If no full name is available, do not proceed—ask the user for their full name.
    """
)

# ================== MAIN CONVERSATION FUNCTION =====================
def run_hr_conversation(user_prompt: str, conversation_history: List[Dict] = None) -> Dict[str, Any]:
    """Run a conversation with the HRMS tools and Groq agent."""
    max_retries = 5
    
    # Initialize conversation history if not provided
    if conversation_history is None:
        conversation_history = []
    
    for attempt in range(max_retries):
        try:
            # Build messages with conversation history
            messages = [
                {"role": "system", "content": system_prompt},
            ]
            
            # Add conversation history
            messages.extend(conversation_history)
            
            # Add current user prompt
            messages.append({"role": "user", "content": user_prompt})
            
            logger.info(f"Processing user prompt: {user_prompt} (Attempt {attempt + 1}/{max_retries})")
            response = execute_groq_request_with_retry(messages, db_tools)
            tool_calls = response.choices[0].message.tool_calls

            if not tool_calls:
                # No tool calls, just return the model's direct response for small talk, conversation,etc.
                # where no tool call needed.
                final_response = response.choices[0].message.content
                
                # Update conversation history with this exchange
                updated_history = conversation_history + [
                    {"role": "user", "content": user_prompt},
                    {"role": "assistant", "content": final_response}
                ]
                
                return {
                    "status": "success",
                    "tool_calls": [],
                    "tool_results": [],
                    "final_response": final_response,
                    "conversation_history": updated_history
                }
            # otherwise, proceed as
            tool_results = execute_tools_parallel(tool_calls)
            tool_messages = []
            for result in tool_results:
                tool_response = result["result"]
                tool_messages.append({
                    "role": "tool",
                    "content": json.dumps(tool_response),
                    "tool_call_id": f"call_{len(tool_messages)}",
                })
            messages.extend(tool_messages)
            final_response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                temperature=0.4,
                max_completion_tokens=1000
            )
            
            # Update conversation history with this exchange
            updated_history = conversation_history + [
                {"role": "user", "content": user_prompt},
                {"role": "assistant", "content": final_response.choices[0].message.content}
            ]
            
            return {
                "status": "success",
                "tool_calls": tool_calls,
                "tool_results": tool_results,
                "final_response": final_response.choices[0].message.content,
                "conversation_history": updated_history
            }
        except GroqAPIError as e:
            logger.error(f"Groq API Error: {e.message}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying due to Groq API error (attempt {attempt + 1}/{max_retries})")
                continue
            return {
                "status": "error",
                "error": e.message,
                "status_code": e.status_code,
                "failed_generation": e.failed_generation,
                "conversation_history": conversation_history
            }
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Unexpected error: {error_msg}")
            
            # Check if it's the specific error we want to retry
            if "'NoneType' object is not iterable" in error_msg:
                if attempt < max_retries - 1:
                    logger.info(f"Retrying due to NoneType error (attempt {attempt + 1}/{max_retries})")
                    continue
                else:
                    return {
                        "status": "error",
                        "error": "I am unable to get information on that after multiple attempts.",
                        "conversation_history": conversation_history
                    }
            # Check for token limit error (413)
            elif "413" in error_msg or "Request too large" in error_msg or "tokens per minute" in error_msg:
                logger.warning(f"Token limit error detected: {error_msg}")
                if attempt < max_retries - 1:
                    logger.info(f"Retrying due to token limit error (attempt {attempt + 1}/{max_retries})")
                    continue
                else:
                    # If still failing after retries, try with reduced payload
                    logger.info("Attempting with reduced payload (first 2500 tokens)")
                    try:
                        # Reduce tool results to first 2500 tokens
                        reduced_tool_messages = []
                        total_tokens = 0
                        for result in tool_results:
                            tool_response = result["result"]
                            response_str = json.dumps(tool_response)
                            if total_tokens + len(response_str) > 2500:
                                # Truncate to fit within 2500 tokens
                                remaining_tokens = 2500 - total_tokens
                                response_str = response_str[:remaining_tokens] + "..."
                                reduced_tool_messages.append({
                                    "role": "tool",
                                    "content": response_str,
                                    "tool_call_id": f"call_{len(reduced_tool_messages)}",
                                })
                                break
                            else:
                                reduced_tool_messages.append({
                                    "role": "tool",
                                    "content": response_str,
                                    "tool_call_id": f"call_{len(reduced_tool_messages)}",
                                })
                                total_tokens += len(response_str)
                        
                        messages = [
                            {"role": "system", "content": system_prompt},
                        ]
                        messages.extend(conversation_history)
                        messages.append({"role": "user", "content": user_prompt})
                        messages.extend(reduced_tool_messages)
                        
                        final_response = client.chat.completions.create(
                            model="llama-3.1-8b-instant",
                            messages=messages,
                            temperature=0.4,
                            max_completion_tokens=1000
                        )
                        
                        # Update conversation history
                        updated_history = conversation_history + [
                            {"role": "user", "content": user_prompt},
                            {"role": "assistant", "content": final_response.choices[0].message.content}
                        ]
                        
                        return {
                            "status": "success",
                            "tool_calls": tool_calls,
                            "tool_results": tool_results,
                            "final_response": final_response.choices[0].message.content,
                            "note": "Response generated with reduced payload due to token limits",
                            "conversation_history": updated_history
                        }
                    except Exception as reduced_error:
                        logger.error(f"Error with reduced payload: {reduced_error}")
                        return {
                            "status": "error",
                            "error": "Unable to process request due to token limits even with reduced payload.",
                            "conversation_history": conversation_history
                        }
            else:
                # For other errors, don't retry
                return {
                    "status": "error",
                    "error": str(e),
                    "conversation_history": conversation_history
                }
    
    # If we've exhausted all retries
    return {
        "status": "error",
        "error": "I am unable to get information on that. Kindly try again.",
        "conversation_history": conversation_history
    }

# ================== EXAMPLE USAGE =====================
if __name__ == "__main__":
    print("\n🚀 HRMS Groq Tool Use Implementation\n" + "=" * 60)
    
    # Test scenarios for all tools in conversation format
    # test_scenarios = [
        # # ================== NORMAL CONVERSATION TESTS ==================
        # {
        #     "name": "Normal Conversation Flow",
        #     "conversation": [
        #         "Hi there!",
        #         "How are you doing today?",
        #         "What can you help me with?",
        #         "Thank you for the information!"
        #     ]
        # },
        
        # # ================== JOB QUERIES TESTS ==================
        # {
        #     "name": "Job Queries Flow",
        #     "conversation": [
        #         "What jobs are available at NASTP?",
        #         "Are there any software engineering roles?",
        #         "What tech jobs are available?",
        #         "Tell me more about the machine learning engineer position"
        #     ]
        # },
        
        # # ================== COMPANY INFO TESTS ==================
        # {
        #     "name": "Company Info Flow",
        #     "conversation": [
        #         "What is NASTP's mission and vision?",
        #         "Tell me about the company benefits",
        #         "What is the work environment like?",
        #         "What are the frequently asked questions?"
        #     ]
        # },
        
        # # ================== CANDIDATE INFO TESTS ==================
        # {
        #     "name": "Candidate Info Flow",
        #     "conversation": [
        #         "What is Muhammad Awais Tariq's profile?",
        #         "Show me Haris Ismail's information",
        #         "Get Ellie Santos candidate details",
        #         "What is Muhammad Awais's application status?"
        #     ]
        # },
        
        # # ================== CANDIDATE-JOB MATCHING TESTS ==================
        # {
        #     "name": "Candidate-Job Matching Flow (Valid Names)",
        #     "conversation": [
        #         "Which job is Muhammad Awais Tariq best suited for?",
        #         "Suggest the best position for Haris Ismail",
        #         "What jobs would be a good fit for Ellie Santos?",
        #         "Tell me more about the software engineer role for Muhammad Awais Tariq"
        #     ]
        # },
        
        # {
        #     "name": "Candidate-Job Matching Flow (Invalid Names)",
        #     "conversation": [
        #         # "Which tech roles would be perfect for me?",
        #         # "My full name is Muhammad Awais Tariq",
        #         "What jobs would be a good fit for me?",
        #         "Tell me more about the software engineer position"
        #     ]
        # },
        
        # {
        #     "name": "Candidate-Job Matching Flow (Single Names)",
        #     "conversation": [
        #         "What jobs would be a good fit for John?",
        #         "Suggest positions for someone with my skills",
        #         "Which career path should I consider?",
        #         "My name is Muhammad Awais Tariq, what jobs match my experience?"
        #     ]
        # },
        
        # # ================== MIXED SCENARIOS TESTS ==================
        # {
        #     "name": "Mixed Tool Usage Flow",
        #     "conversation": [
        #         "Hi, I'm interested in working at NASTP",
        #         "What jobs are currently available?",
        #         "What is the company culture like?",
        #         "My name is Muhammad Awais Tariq, which positions would suit me best?",
        #         "Tell me more about the benefits package"
        #     ]
        # },
        
        # {
        #     "name": "Complex Conversation Flow",
        #     "conversation": [
        #         "Hello! I'm looking for career opportunities",
        #         "What is NASTP's mission?",
        #         "I'm Muhammad Awais Tariq, what roles match my background?",
        #         "What are the requirements for the software engineer position?",
        #         "How do I apply for these positions?",
        #         "Thank you for all the information!"
        #     ]
        # }
        
        # # ================== CANDIDATE APPLICATION STATUS TESTS ==================
        # {
        #     "name": "Candidate Application Status Flow (Valid Names)",
        #     "conversation": [
        #         "What is the status of Muhammad Awais Tariq's applications?",
        #         "Show me my application updates",
        #         "What jobs have I applied for?",
        #         "Tell me about my application status"
        #     ]
        # },
        
        # {
        #     "name": "Candidate Application Status Flow (Invalid Names)",
        #     "conversation": [
        #         "What's my application status?",
        #         "Show me my job applications",
        #         "What positions have I applied to?",
        #         "My name is Muhammad Awais Tariq, what's my application status?"
        #     ]
        # },
        
    #     {
    #         "name": "Candidate Application Status Flow (Mixed Context)",
    #         "conversation": [
    #             "Hi, I'm Muhammad Awais Tariq",
    #             "What jobs are available?",
    #             "What's the status of my applications?",
    #             "Show me my application updates for the software engineer position"
    #         ]
    #     },
    # ]
    
    # print("\n🧪 Testing All Tool Scenarios:")
    # print("=" * 60)
    
    # for scenario_idx, scenario in enumerate(test_scenarios, 1):
    #     print(f"\n📋 Scenario {scenario_idx}: {scenario['name']}")
    #     print("=" * 50)
        
    #     conversation_history = []
        
    #     for i, prompt in enumerate(scenario['conversation'], 1):
    #         print(f"\n💬 User {i}: {prompt}")
    #         result = run_hr_conversation(prompt, conversation_history)
            
    #         if result["status"] == "success":
    #             # print(f"✅ Assistant {i}: {result['final_response'][:150]}...")
    #             print(f"✅ Assistant {i}: {result['final_response']}")
    #             # Update conversation history for next iteration
    #             conversation_history = result.get("conversation_history", conversation_history)
    #             print(f"📝 Tool calls made: {len(result['tool_calls'])}")
    #             for j, tool_result in enumerate(result['tool_results']):
    #                 success = "✅" if tool_result['success'] else "❌"
    #                 tool_name = tool_result['tool_call'].function.name
    #                 print(f"   Tool {j+1}: {tool_name} {success}")
    #         else:
    #             print(f"❌ Error: {result['error']}")
    #             # Still update conversation history even on error
    #             conversation_history = result.get("conversation_history", conversation_history)
            
    #         print("-" * 50)
        
    #     print(f"📊 Scenario {scenario_idx} conversation history length: {len(conversation_history)} messages")
    #     print("=" * 50)
    
    # print(f"\n🎯 Total scenarios completed: {len(test_scenarios)}")
    
    # Original test prompts (commented out for now)
    # test_prompts = [
    #     # Job-related queries (3+ tests)
    #     # "What are the available positions at NASTP?",
    #     # "Show me current job openings",
    #     # "What jobs are currently hiring?",
    #     # "List all active job positions",
    #     
    #     # # Company info queries (3+ tests)
    #     # "What is NASTP's mission, vison, benefits?",
    #     # "Tell me about the company vision",
    #     # "What are the employee benefits?",
    #     # "What is the work environment like?",
    #     # "Tell me about NASTP company",
    #     # "What are the frequently asked questions?",
    #     
    #     # # Candidate queries (3+ tests for each candidate)
    #     # "What is Muhammad Awais tariq's profile?",
    #     # "Show me Haris Ismail's information",
    #     # "Get ellie santos candidate details",
    #     # "What is Muhammad Awais's application status?",
    #     # "Tell me about Haris Ismail's resume",
    #     # "Show ellie santos profile information",
    #     # "Get candidate info for Muhammad Awais tariq",
    #     # "What are Haris Ismail's details?",
    #     # "Show ellie santos candidate profile",
    #     # "Hi",
    #     # "Hello!",
    #     # "How are you?",
    #     # "Good morning!",
    #     # "Good afternoon!",
    #     # "Good evening!",
    #     # "What's your name?",
    #     # "Who are you?",
    #     # "What can you do?",
    #     # "Tell me about yourself.",
    #     # "Can you help me?",
    #     # "What is NASTP?",
    #     # "What does HR assistant mean?",
    #     # "How can you assist me today?",
    #     # "What is your purpose?",
    #     # "Are you a real person?",
    #     # "Can I ask you anything?",
    #     # "Do you work 24/7?",
    #     # "What languages do you speak?",
    #     # "Thank you!",
    #     # "Which job is Muhammad Awais Tariq best suited for?",
    #     # "Suggest the best position for Haris Ismail",
    #     # "What jobs would be a good fit for Ellie Santos?",
    #     # "Recommend the ideal career path for Muhammad Awais Tariq",
    #     # "Which profession would maximize Haris Ismail's potential?",
    #     # "What type of work environment suits Ellie Santos best?",
    #     # "Suggest three job titles that would fit Muhammad Awais Tariq's skills",
    #     # "What industry should Haris Ismail consider for maximum growth?",
    #     # "List suitable positions for Ellie Santos based on common strengths",
    #     # "Where would Muhammad awais tariq thrive professionally?",
    #     # "Name dream jobs that align with Haris Ismail's probable talents",
    #     # "What unconventional careers might suit ellie?",
    #     "Which tech roles would be perfect for Awais?",
    #     # "Suggest managerial positions Haris Ismail could excel in",
    #     # "What creative jobs match Ellie Santos's potential personality traits?",
    #     # "Recommend remote work options for Muhammad Awais Tariq",
    #     # "What executive positions should Haris Ismail aim for?",
    #     # "Which healthcare roles would fit Ellie Santos's compassionate nature?"
    # ]
    
    def safe_json(obj):
        if isinstance(obj, list):
            # print(f"DEBUG: list type: {type(obj)}")
            return [safe_json(i) for i in obj]
        elif isinstance(obj, dict):
            # print(f"DEBUG: dict type: {type(obj)}")
            return {k: safe_json(v) for k, v in obj.items()}
        elif isinstance(obj, (pd.Timestamp, datetime.datetime, datetime.date)):
            # print(f"DEBUG: timestamp type: {type(obj)}, value: {obj}")
            return obj.isoformat()
        elif isinstance(obj, np.generic):
            # print(f"DEBUG: np.generic type: {type(obj)}, value: {obj}")
            return obj.item()
        elif hasattr(obj, "to_dict"):
            # print(f"DEBUG: to_dict type: {type(obj)}")
            return obj.to_dict()
        elif hasattr(obj, "__dict__"):
            # print(f"DEBUG: __dict__ type: {type(obj)}")
            return {k: safe_json(v) for k, v in obj.__dict__.items() if not k.startswith('_')}
        else:
            # print(f"DEBUG: Unhandled type: {type(obj)}, value: {obj}")
            return obj

    # Run all tests
    # for i, prompt in enumerate(test_prompts, 1):
    #     print(f"\n{'='*20} Test {i}: {prompt} {'='*20}")
    #     result = run_hr_conversation(prompt)
        
    #     if result["status"] == "success":
    #         print(f"✅ Success!")
    #         print(f"📝 Response: {result['final_response']}")
    #         print(f"🔧 Tool calls made: {len(result['tool_calls'])}")
    #         for j, tool_result in enumerate(result['tool_results']):
    #             success = "✅" if tool_result['success'] else "❌"
    #             tool_name = tool_result['tool_call'].function.name
    #             print(f"   Tool {j+1}: {tool_name} {success}")
    #     else:
    #         print(f"❌ Error: {result['error']}")
        
    #     print()  # Empty line for readability
    print("Type your prompt and press Enter. Type 'exit' or 'quit' to end the conversation.")
    
    conversation_history = []
    turn = 1
    while True:
        user_prompt = input(f"\n💬 User {turn}: ")
        if user_prompt.strip().lower() in ["exit", "quit"]:
            print("👋 Exiting chat. Goodbye!")
            break
        result = run_hr_conversation(user_prompt, conversation_history)
        if result["status"] == "success":
            print(f"✅ Assistant {turn}: {result['final_response']}")
            conversation_history = result.get("conversation_history", conversation_history)
            print(f"📝 Tool calls made: {len(result['tool_calls'])}")
            for j, tool_result in enumerate(result['tool_results']):
                success = "✅" if tool_result['success'] else "❌"
                tool_name = tool_result['tool_call'].function.name
                print(f"   Tool {j+1}: {tool_name} {success}")
        else:
            print(f"❌ Error: {result['error']}")
            conversation_history = result.get("conversation_history", conversation_history)
        turn += 1
