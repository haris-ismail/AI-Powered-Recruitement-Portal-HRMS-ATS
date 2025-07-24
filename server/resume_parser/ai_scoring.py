import sys
import json
import re
import argparse
from datetime import datetime
from groq import Groq
import os

# --- Hardcoded API Key for Debugging ---
# This is not secure for production. Remove after testing.
api_key = "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"
client = Groq(api_key=api_key)
# -----------------------------------------

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
Return a structured JSON response with scores in 4 categories only:

1. EducationScore (out of 10): Match between candidate's education and job requirements.
2. SkillsScore (out of 10): Overlap between required and listed skills.
3. ExperienceYearsScore (out of 10): Based on number of years of relevant experience.
4. ExperienceRelevanceScore (out of 10): How well past job roles align with this role.

Only output this exact format:
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
    prompt = build_ats_prompt_v2(resume_text, job_description)
    response = client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        max_tokens=256,
        top_p=1,
        stream=False
    )
    return response.choices[0].message.content

def extract_json_struct(text):
    try:
        json_like = re.search(r'\{.*\}', text, re.DOTALL)
        if json_like:
            return json.loads(json_like.group())
    except Exception as e:
        print(f"Error parsing JSON: {e}", file=sys.stderr)
    return {"error": "Could not parse response"}

def main():
    parser = argparse.ArgumentParser(description="AI Scoring and Red Flag Detection")
    parser.add_argument('--input', type=str, help='Path to input JSON file. If not provided, reads from stdin.')
    args = parser.parse_args()
    if args.input:
        with open(args.input, 'r', encoding='utf-8') as f:
            data = json.load(f)
    else:
        data = json.load(sys.stdin)
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
    # api_key = data.get("groq_api_key") or os.environ.get("GROQ_API_KEY")
    # if not api_key:
    #     print("Error: GROQ_API_KEY not found in input or environment.", file=sys.stderr)
    #     sys.exit(1)

    # Use the globally defined client
    response_text = evaluate_resume_with_ats_scoring(resume, job_description, client)
    scores = extract_json_struct(response_text)
    red_flag = detect_red_flag(experience_dates, education_dates)
    # Calculate weighted score
    try:
        weighted_score = (
            scores['EducationScore'] * weights['EducationScore'] +
            scores['SkillsScore'] * weights['SkillsScore'] +
            scores['ExperienceYearsScore'] * weights['ExperienceYearsScore'] +
            scores['ExperienceRelevanceScore'] * weights['ExperienceRelevanceScore']
        )
        weighted_score = round(weighted_score * 10, 2)
    except Exception as e:
        weighted_score = None
    result = {
        "Scores": scores,
        "WeightedScore": weighted_score,
        "RedFlag": red_flag
    }
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
