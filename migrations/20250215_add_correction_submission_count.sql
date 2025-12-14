ALTER TABLE homestay_applications
ADD COLUMN IF NOT EXISTS correction_submission_count INTEGER NOT NULL DEFAULT 0;
