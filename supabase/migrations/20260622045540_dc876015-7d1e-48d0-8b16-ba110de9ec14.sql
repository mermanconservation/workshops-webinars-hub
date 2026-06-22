ALTER TABLE public.courses ADD COLUMN is_public boolean NOT NULL DEFAULT true;
ALTER TABLE public.workshops ADD COLUMN is_public boolean NOT NULL DEFAULT true;