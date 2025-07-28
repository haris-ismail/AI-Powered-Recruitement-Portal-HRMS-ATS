-- Add hiredAt and source to applications
ALTER TABLE applications ADD COLUMN hired_at TIMESTAMP;
ALTER TABLE applications ADD COLUMN source TEXT;

-- Create offers table
CREATE TABLE offers (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES candidates(id),
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    offered_at TIMESTAMP DEFAULT NOW(),
    accepted BOOLEAN DEFAULT FALSE,
    accepted_at TIMESTAMP
);

-- Create job_costs table
CREATE TABLE job_costs (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id),
    cost INTEGER NOT NULL,
    description TEXT,
    incurred_at TIMESTAMP DEFAULT NOW()
); 