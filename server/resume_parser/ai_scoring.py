import sys
import json
import re
import argparse
from datetime import datetime
from groq import Groq
import os

# Get API key from environment variable
api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    print("Error: GROQ_API_KEY environment variable not found.", file=sys.stderr)
    sys.exit(1)

try:
    client = Groq(api_key=api_key)
except Exception as e:
    print(f"Error initializing Groq client: {e}", file=sys.stderr)
    sys.exit(1)

def parse_date(d):
    return datetime.strptime(d, "%Y-%m-%d")

def detect_red_flag(experiences, educations):
    red_flags = []
    experiences = sorted(experiences, key=lambda x: parse_date(x[0]))
    educations = sorted(educations, key=lambda x: parse_date(x[0]))
    short_roles = 0
    for exp in experiences:
        start = parse_date(exp[0])
        end = parse_date(exp[1])
        duration_months = (end.year - start.year) * 12 + (end.month - start.month)
        if duration_months < 12:
            short_roles += 1
    if short_roles >= 2:
        red_flags.append("Frequent Job Switching (<1 year roles)")
    for i in range(1, len(experiences)):
        prev_end = parse_date(experiences[i - 1][1])
        curr_start = parse_date(experiences[i][0])
        gap_months = (curr_start.year - prev_end.year) * 12 + (curr_start.month - prev_end.month)
        if gap_months > 6:
            gap_covered = False
            for edu in educations:
                edu_start = parse_date(edu[0])
                edu_end = parse_date(edu[1])
                if prev_end < edu_end and curr_start > edu_start:
                    gap_covered = True
                    break
            if not gap_covered:
                red_flags.append("Work Gap > 6 Months")
                break
    if experiences:
        most_recent_end = parse_date(experiences[-1][1])
        today = datetime.today()
        unemployment_months = (today.year - most_recent_end.year) * 12 + (today.month - most_recent_end.month)
        if unemployment_months > 6:
            red_flags.append("Unemployed > 6 Months (Currently)")
    return ", ".join(set(red_flags)) if red_flags else "None"

def build_ats_prompt_v2(resume_text, job_description):
    return f"""
Act like a highly experienced and accurate Application Tracking System (ATS).
Your task is to evaluate the candidate's resume data against the provided job description.

First, provide a detailed analysis explaining your reasoning for each scoring category.
Then, return a structured JSON response with scores in 4 categories only.

SCORING CATEGORIES:
1. EducationScore (out of 10): Match between candidate's education and job requirements.
2. SkillsScore (out of 10): Overlap between required and listed skills.
3. ExperienceYearsScore (out of 10): Based on number of years of relevant experience.
4. ExperienceRelevanceScore (out of 10): How well past job roles align with this role.

Please provide your analysis first, then the JSON scores in this exact format:
{{
  "EducationScore": <int 0–10>,
  "SkillsScore": <int 0–10>,
  "ExperienceYearsScore": <int 0–10>,
  "ExperienceRelevanceScore": <int 0–10>
}}

resume: {resume_text}
job_description: {job_description}
"""

def evaluate_resume_with_ats_scoring(resume_text, job_description, client):
    try:
        prompt = build_ats_prompt_v2(resume_text, job_description)
        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=512,  # Increased to capture more reasoning
            top_p=1,
            stream=False
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error calling Groq API: {e}", file=sys.stderr)
        raise e

def extract_json_struct(text):
    try:
        # First try to extract JSON from the response
        json_like = re.search(r'\{.*\}', text, re.DOTALL)
        if json_like:
            scores = json.loads(json_like.group())
            # Extract the reasoning text (everything before the JSON)
            reasoning = text.replace(json_like.group(), '').strip()
            return {"scores": scores, "reasoning": reasoning}
    except Exception as e:
        print(f"Error parsing JSON: {e}", file=sys.stderr)
    return {"error": "Could not parse response", "reasoning": text}

def main():
    parser = argparse.ArgumentParser(description="AI Scoring and Red Flag Detection")
    parser.add_argument('--input', type=str, help='Path to input JSON file. If not provided, reads from stdin.')
    args = parser.parse_args()
    if args.input:
        with open(args.input, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        data = json.load(sys.stdin)
    
    # Debug: Print input data
    print(f"DEBUG: Received data keys: {list(data.keys())}", file=sys.stderr)
    print(f"DEBUG: Weights received: {data.get('weights', 'Not found')}", file=sys.stderr)
    
    # Required fields: resume, job_description, experience_dates, education_dates
    resume = data["resume"]
    job_description = data["job_description"]
    experience_dates = data.get("experience_dates", [])
    education_dates = data.get("education_dates", [])
    weights = data.get("weights", {
        'EducationScore': 0.50,
        'SkillsScore': 0.30,
        'ExperienceYearsScore': 0.10,
        'ExperienceRelevanceScore': 0.10
    })
    
    print(f"DEBUG: Using weights: {weights}", file=sys.stderr)
    
    try:
        response_text = evaluate_resume_with_ats_scoring(resume, job_description, client)
        print(f"DEBUG: AI Response: {response_text}", file=sys.stderr)
    except Exception as e:
        print(f"DEBUG: Error calling AI: {e}", file=sys.stderr)
        # Fallback to mock scores for testing
        print(f"DEBUG: Using fallback scores", file=sys.stderr)
        response_text = '{"EducationScore": 7, "SkillsScore": 8, "ExperienceYearsScore": 6, "ExperienceRelevanceScore": 7}'
    
    scores_and_reasoning = extract_json_struct(response_text)
    print(f"DEBUG: Parsed scores: {scores_and_reasoning}", file=sys.stderr)
    
    red_flag = detect_red_flag(experience_dates, education_dates)
    
    # Calculate weighted score
    try:
        weighted_score = (
            scores_and_reasoning['scores']['EducationScore'] * weights['EducationScore'] +
            scores_and_reasoning['scores']['SkillsScore'] * weights['SkillsScore'] +
            scores_and_reasoning['scores']['ExperienceYearsScore'] * weights['ExperienceYearsScore'] +
            scores_and_reasoning['scores']['ExperienceRelevanceScore'] * weights['ExperienceRelevanceScore']
        )
        weighted_score = round(weighted_score * 10)  # Convert to integer percentage
        print(f"DEBUG: Calculated weighted score: {weighted_score}", file=sys.stderr)
    except Exception as e:
        print(f"DEBUG: Error calculating weighted score: {e}", file=sys.stderr)
        weighted_score = None
    
    result = {
        "Scores": scores_and_reasoning['scores'],
        "WeightedScore": weighted_score,
        "RedFlag": red_flag,
        "Reasoning": scores_and_reasoning['reasoning']
    }
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
