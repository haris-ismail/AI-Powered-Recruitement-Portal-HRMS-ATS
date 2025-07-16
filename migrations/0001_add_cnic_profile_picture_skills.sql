-- Add CNIC and profile_picture columns to candidates
ALTER TABLE "candidates"
  ADD COLUMN "cnic" text NOT NULL UNIQUE,
  ADD COLUMN "profile_picture" text;

-- Create skills table
CREATE TABLE "skills" (
  "id" serial PRIMARY KEY NOT NULL,
  "candidate_id" integer NOT NULL,
  "name" text NOT NULL,
  "expertise_level" integer NOT NULL,
  CONSTRAINT "skills_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id")
); 