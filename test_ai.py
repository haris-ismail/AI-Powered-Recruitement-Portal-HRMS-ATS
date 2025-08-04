import json
import sys
import os

# Test data
test_input = {
    "resume": "PROFESSIONAL SUMMARY\nAspiring AI/ML Engineer with 2+ years of hands-on experience in developing full-stack, production-ready intelligent systems.",
    "job_description": "Software Developer with Python and Machine Learning skills",
    "experience_dates": [["2022-01-01", "2024-01-01"]],
    "education_dates": [["2020-01-01", "2022-01-01"]],
    "weights": {
        "EducationScore": 0.25,
        "SkillsScore": 0.5,
        "ExperienceYearsScore": 0.125,
        "ExperienceRelevanceScore": 0.125
    }
}

# Write test input to stdin
json.dump(test_input, sys.stdout) 