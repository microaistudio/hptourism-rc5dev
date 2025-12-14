CREATE TABLE IF NOT EXISTS public.storage_objects (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    object_key text NOT NULL UNIQUE,
    storage_provider varchar(20) NOT NULL DEFAULT 'local',
    file_type varchar(100) NOT NULL,
    category varchar(100) DEFAULT 'general',
    mime_type varchar(100) DEFAULT 'application/octet-stream',
    size_bytes integer NOT NULL DEFAULT 0,
    checksum_sha256 varchar(128),
    uploaded_by varchar REFERENCES public.users(id),
    application_id varchar REFERENCES public.homestay_applications(id) ON DELETE SET NULL,
    document_id varchar REFERENCES public.documents(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS storage_objects_application_idx ON public.storage_objects(application_id);
CREATE INDEX IF NOT EXISTS storage_objects_document_idx ON public.storage_objects(document_id);
