-- Migration: Add AI scoring fields to applications table
ALTER TABLE applications
  ADD COLUMN ai_score INTEGER,
  ADD COLUMN ai_score_breakdown JSON,
  ADD COLUMN red_flags TEXT; 