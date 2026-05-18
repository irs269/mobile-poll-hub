
-- Add public access flag to surveys
ALTER TABLE public.surveys ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Allow anyone (including anonymous) to view public + active surveys
CREATE POLICY "Public can view public active surveys"
ON public.surveys
FOR SELECT
USING (is_public = true AND is_active = true);

-- Allow anyone to view questions of public + active surveys
CREATE POLICY "Public can view questions of public surveys"
ON public.survey_questions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.surveys s
  WHERE s.id = survey_questions.survey_id
    AND s.is_public = true
    AND s.is_active = true
));

-- Allow anyone to view sections of public + active surveys
CREATE POLICY "Public can view sections of public surveys"
ON public.survey_sections
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.surveys s
  WHERE s.id = survey_sections.survey_id
    AND s.is_public = true
    AND s.is_active = true
));

-- Allow anyone (including anonymous) to submit responses on public + active surveys
-- (surveyor_id must be NULL for anonymous submissions)
CREATE POLICY "Public can submit responses to public surveys"
ON public.survey_responses
FOR INSERT
WITH CHECK (
  surveyor_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.surveys s
    WHERE s.id = survey_responses.survey_id
      AND s.is_public = true
      AND s.is_active = true
  )
);
