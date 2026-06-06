-- Fix infinite recursion in RLS policies
-- The problem: Admin-check policies query profiles from within profiles RLS, creating recursion.
-- Fix: Allow all authenticated users to read profiles. Write operations stay restricted.

-- Drop the recursive admin-read profiles policy
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;

-- Create a non-recursive policy: any authenticated user can read all profiles
-- Profiles contain no sensitive data (no passwords), just role/name/school etc.
DROP POLICY IF EXISTS "Authenticated users read profiles" ON public.profiles;
CREATE POLICY "Authenticated users read profiles" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);

-- Also fix sheets/mistakes/ocr admin policies that reference profiles
-- These cause recursion when an admin user queries these tables
-- Solution: Use auth.jwt() or a simpler check

-- Sheets: simplify admin read policy
DROP POLICY IF EXISTS "Admins read all sheets" ON public.sheets;
CREATE POLICY "Admins read all sheets" ON public.sheets FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- Sheets: simplify admin delete policy
DROP POLICY IF EXISTS "Admins delete any sheet" ON public.sheets;
CREATE POLICY "Admins delete any sheet" ON public.sheets FOR DELETE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- Mistakes: simplify admin read policy
DROP POLICY IF EXISTS "Admins read all mistakes" ON public.mistakes;
CREATE POLICY "Admins read all mistakes" ON public.mistakes FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- Mistakes: simplify admin delete policy
DROP POLICY IF EXISTS "Admins delete any mistake" ON public.mistakes;
CREATE POLICY "Admins delete any mistake" ON public.mistakes FOR DELETE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- OCR: simplify admin read policy
DROP POLICY IF EXISTS "Admins read all ocr" ON public.ocr_results;
CREATE POLICY "Admins read all ocr" ON public.ocr_results FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- Config: simplify admin policy
DROP POLICY IF EXISTS "Admins CRUD config" ON public.config;
CREATE POLICY "Admins CRUD config" ON public.config FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- Notifications: simplify
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (
  user_id = auth.uid() OR target_role = 'all' OR (
    target_role = 'admin' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
  ) OR (
    target_role = 'teacher' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'teacher'
  )
);

DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- Admin Logs: simplify
DROP POLICY IF EXISTS "Admins read logs" ON public.admin_logs;
CREATE POLICY "Admins read logs" ON public.admin_logs FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

DROP POLICY IF EXISTS "Admins insert logs" ON public.admin_logs;
CREATE POLICY "Admins insert logs" ON public.admin_logs FOR INSERT WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- API Stats: simplify
DROP POLICY IF EXISTS "Admins read api stats" ON public.api_stats;
CREATE POLICY "Admins read api stats" ON public.api_stats FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'super_admin')
);
