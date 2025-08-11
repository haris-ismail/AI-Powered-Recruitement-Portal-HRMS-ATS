-- Migration: Add sent_emails table for email tracking
-- Created: 2024-01-XX

CREATE TABLE IF NOT EXISTS "sent_emails" (
  "id" serial PRIMARY KEY,
  "candidate_id" integer NOT NULL,
  "template_id" integer NOT NULL,
  "admin_id" integer NOT NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "recipient_email" text NOT NULL,
  "sent_at" timestamp DEFAULT now(),
  "status" text DEFAULT 'sent',
  "error_message" text,
  CONSTRAINT "sent_emails_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE,
  CONSTRAINT "sent_emails_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE CASCADE,
  CONSTRAINT "sent_emails_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "sent_emails_candidate_id_idx" ON "sent_emails" ("candidate_id");
CREATE INDEX IF NOT EXISTS "sent_emails_template_id_idx" ON "sent_emails" ("template_id");
CREATE INDEX IF NOT EXISTS "sent_emails_admin_id_idx" ON "sent_emails" ("admin_id");
CREATE INDEX IF NOT EXISTS "sent_emails_sent_at_idx" ON "sent_emails" ("sent_at");
CREATE INDEX IF NOT EXISTS "sent_emails_status_idx" ON "sent_emails" ("status"); 