CREATE POLICY "Admins can delete responses"
ON public.survey_responses
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Supervisors can delete responses"
ON public.survey_responses
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'supervisor'::app_role));