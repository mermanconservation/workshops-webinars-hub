
-- 1) Lesson completions: remove public DELETE-true policy, route unmark via security-definer fn
DROP POLICY IF EXISTS "Anyone can remove lesson completions" ON public.lesson_completions;

CREATE OR REPLACE FUNCTION public.unmark_lesson_completion(p_lesson_id uuid, p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'email required';
  END IF;
  DELETE FROM public.lesson_completions
   WHERE lesson_id = p_lesson_id
     AND email = lower(p_email);
END;
$$;

REVOKE ALL ON FUNCTION public.unmark_lesson_completion(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unmark_lesson_completion(uuid, text) TO anon, authenticated, service_role;

-- 2) Presenters: hide email column from public reads via column-level grants
REVOKE SELECT ON public.presenters FROM anon, authenticated;
GRANT SELECT (id, name, title, bio, photo_url, signature_url, created_at) ON public.presenters TO anon, authenticated;
GRANT ALL ON public.presenters TO service_role;

-- 3) Storage: explicit deny of anon UPDATE/DELETE (admin uploads via service role / edge fn)
DROP POLICY IF EXISTS "Service role manages workshop assets update" ON storage.objects;
DROP POLICY IF EXISTS "Service role manages workshop assets delete" ON storage.objects;

CREATE POLICY "Service role manages workshop assets update"
ON storage.objects FOR UPDATE TO service_role
USING (bucket_id = 'workshop-assets') WITH CHECK (bucket_id = 'workshop-assets');

CREATE POLICY "Service role manages workshop assets delete"
ON storage.objects FOR DELETE TO service_role
USING (bucket_id = 'workshop-assets');
