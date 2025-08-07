-- Add social links to candidates table
ALTER TABLE candidates ADD COLUMN linkedin_url TEXT;
ALTER TABLE candidates ADD COLUMN github_url TEXT;

-- Create projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description JSON NOT NULL,
    tech_stack TEXT,
    github_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_projects_candidate_id ON projects(candidate_id); 