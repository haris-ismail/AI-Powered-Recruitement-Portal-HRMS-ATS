-- Migration: Update CNIC validation from 14 to 13 digits
-- This migration ensures all CNIC values are exactly 13 digits

-- First, add a check constraint to ensure CNIC is exactly 13 digits
ALTER TABLE candidates 
ADD CONSTRAINT cnic_13_digits_check 
CHECK (cnic ~ '^[0-9]{13}$');

-- Update any existing CNIC values that might be 14 digits to 13 digits
-- This removes the first digit if it's 14 digits long
UPDATE candidates 
SET cnic = SUBSTRING(cnic FROM 2) 
WHERE LENGTH(cnic) = 14;

-- Also ensure no CNIC is longer than 13 digits
UPDATE candidates 
SET cnic = LEFT(cnic, 13) 
WHERE LENGTH(cnic) > 13;

-- Add a comment to document the change
COMMENT ON COLUMN candidates.cnic IS 'CNIC must be exactly 13 digits (Pakistan National Identity Card)';
