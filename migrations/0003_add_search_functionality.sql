-- Migration: Add search functionality
-- This migration adds search-related tables and indexes

-- Create search_queries table
CREATE TABLE IF NOT EXISTS "search_queries" (
  "id" serial PRIMARY KEY,
  "query" text NOT NULL,
  "filters" json,
  "results_count" integer,
  "created_by" integer NOT NULL REFERENCES "users"("id"),
  "created_at" timestamp DEFAULT now()
);

-- Add full-text search index to candidates table for resume_text
CREATE INDEX IF NOT EXISTS "idx_candidates_resume_text_fts" 
ON "candidates" USING gin(to_tsvector('english', "resume_text"));

-- Add index for search queries by user
CREATE INDEX IF NOT EXISTS "idx_search_queries_created_by" 
ON "search_queries"("created_by");

-- Add index for search queries by creation date
CREATE INDEX IF NOT EXISTS "idx_search_queries_created_at" 
ON "search_queries"("created_at");

-- Add indexes for common search filters
CREATE INDEX IF NOT EXISTS "idx_candidates_city" ON "candidates"("city");
CREATE INDEX IF NOT EXISTS "idx_candidates_province" ON "candidates"("province");
CREATE INDEX IF NOT EXISTS "idx_applications_status" ON "applications"("status");
CREATE INDEX IF NOT EXISTS "idx_experience_skills" ON "experience"("skills"); 