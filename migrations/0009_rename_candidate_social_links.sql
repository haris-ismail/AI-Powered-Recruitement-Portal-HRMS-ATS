-- Rename social link columns on candidates table to remove snake_case (safe if already renamed)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'linkedin_url'
  ) THEN
    EXECUTE 'ALTER TABLE candidates RENAME COLUMN linkedin_url TO linkedin';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'candidates' AND column_name = 'github_url'
  ) THEN
    EXECUTE 'ALTER TABLE candidates RENAME COLUMN github_url TO github';
  END IF;
END$$;


