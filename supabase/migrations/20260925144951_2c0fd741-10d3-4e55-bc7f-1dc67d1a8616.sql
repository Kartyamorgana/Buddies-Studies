DROP POLICY IF EXISTS "Anyone can read campuses" ON public.target_campuses;
REVOKE SELECT ON public.target_campuses FROM anon;
CREATE POLICY "Signed-in users can read campuses" ON public.target_campuses FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);