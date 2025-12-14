ALTER TABLE IF EXISTS public.homestay_applications
    ADD COLUMN IF NOT EXISTS da_remarks text;
