-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mistakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_stats ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admin update any profile" ON public.profiles;
CREATE POLICY "Admin update any profile" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Sheets RLS
DROP POLICY IF EXISTS "Users CRUD own sheets" ON public.sheets;
CREATE POLICY "Users CRUD own sheets" ON public.sheets FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all sheets" ON public.sheets;
CREATE POLICY "Admins read all sheets" ON public.sheets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Admins delete any sheet" ON public.sheets;
CREATE POLICY "Admins delete any sheet" ON public.sheets FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Mistakes RLS
DROP POLICY IF EXISTS "Users CRUD own mistakes" ON public.mistakes;
CREATE POLICY "Users CRUD own mistakes" ON public.mistakes FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all mistakes" ON public.mistakes;
CREATE POLICY "Admins read all mistakes" ON public.mistakes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Admins delete any mistake" ON public.mistakes;
CREATE POLICY "Admins delete any mistake" ON public.mistakes FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- OCR Results RLS
DROP POLICY IF EXISTS "Users CRUD own ocr" ON public.ocr_results;
CREATE POLICY "Users CRUD own ocr" ON public.ocr_results FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all ocr" ON public.ocr_results;
CREATE POLICY "Admins read all ocr" ON public.ocr_results FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Config RLS (admin only)
DROP POLICY IF EXISTS "Admins CRUD config" ON public.config;
CREATE POLICY "Admins CRUD config" ON public.config FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Notifications RLS
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (
  user_id = auth.uid() OR target_role = 'all' OR (
    target_role = 'admin' AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  ) OR (
    target_role = 'teacher' AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'
    )
  )
);

DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Admin Logs RLS
DROP POLICY IF EXISTS "Admins read logs" ON public.admin_logs;
CREATE POLICY "Admins read logs" ON public.admin_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Admins insert logs" ON public.admin_logs;
CREATE POLICY "Admins insert logs" ON public.admin_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- API Stats RLS
DROP POLICY IF EXISTS "Admins read api stats" ON public.api_stats;
CREATE POLICY "Admins read api stats" ON public.api_stats FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Users insert api stats" ON public.api_stats;
CREATE POLICY "Users insert api stats" ON public.api_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
