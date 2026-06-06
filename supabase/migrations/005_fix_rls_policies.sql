-- Explicit WITH CHECK on user-owned tables for INSERT safety
DROP POLICY IF EXISTS "Users CRUD own sheets" ON public.sheets;
CREATE POLICY "Users CRUD own sheets" ON public.sheets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users CRUD own mistakes" ON public.mistakes;
CREATE POLICY "Users CRUD own mistakes" ON public.mistakes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users CRUD own ocr" ON public.ocr_results;
CREATE POLICY "Users CRUD own ocr" ON public.ocr_results
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Teachers cannot self-approve or change role
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND status = (SELECT status FROM public.profiles WHERE id = auth.uid())
  );
