-- Migration to rename social media columns to match Drizzle schema
-- Rename linkedin_url to linkedin
ALTER TABLE candidates RENAME COLUMN linkedin_url TO linkedin;

-- Rename github_url to github  
ALTER TABLE candidates RENAME COLUMN github_url TO github; 