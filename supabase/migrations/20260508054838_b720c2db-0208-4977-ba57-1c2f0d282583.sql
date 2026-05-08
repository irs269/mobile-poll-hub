
CREATE TABLE public.survey_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id uuid NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.survey_questions ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.survey_sections(id) ON DELETE SET NULL;

CREATE INDEX idx_survey_sections_survey ON public.survey_sections(survey_id);
CREATE INDEX idx_survey_questions_section ON public.survey_questions(section_id);

ALTER TABLE public.survey_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sections"
ON public.survey_sections FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can manage sections"
ON public.survey_sections FOR ALL
USING (has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Surveyors can view sections of assigned surveys"
ON public.survey_sections FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.survey_assignments
  WHERE survey_assignments.survey_id = survey_sections.survey_id
    AND survey_assignments.surveyor_id = auth.uid()
));
