
-- Add partner logos to workshops (array of URLs)
ALTER TABLE public.workshops ADD COLUMN partner_logos text[] DEFAULT '{}';

-- Create certificate verification table
CREATE TABLE public.certificate_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  verification_code TEXT NOT NULL UNIQUE,
  participant_name TEXT NOT NULL,
  workshop_id UUID NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  workshop_title TEXT NOT NULL,
  workshop_date TEXT NOT NULL,
  certificate_type TEXT NOT NULL DEFAULT 'participant',
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_name TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.certificate_verifications ENABLE ROW LEVEL SECURITY;

-- Public read for verification
CREATE POLICY "Anyone can verify certificates"
  ON public.certificate_verifications
  FOR SELECT
  USING (true);

-- Create index for fast lookup
CREATE INDEX idx_cert_verification_code ON public.certificate_verifications(verification_code);
