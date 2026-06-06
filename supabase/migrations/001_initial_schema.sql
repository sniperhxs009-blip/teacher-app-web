-- Profiles table (extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  openid TEXT UNIQUE,
  nickname TEXT NOT NULL DEFAULT '',
  avatar_url TEXT DEFAULT '',
  real_name TEXT NOT NULL DEFAULT '',
  school TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '其他',
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'teacher' CHECK (role IN ('teacher', 'admin', 'super_admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'frozen')),
  register_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approve_time TIMESTAMPTZ,
  approved_by UUID REFERENCES public.profiles(id),
  reject_reason TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_school ON public.profiles(school);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', '新用户'),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sheets
CREATE TABLE IF NOT EXISTS public.sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL DEFAULT '',
  storage_path TEXT DEFAULT '',
  file_type TEXT DEFAULT 'xlsx',
  file_size BIGINT DEFAULT 0,
  subject TEXT DEFAULT '',
  grade TEXT DEFAULT '',
  exam_type TEXT DEFAULT '',
  exam_date DATE,
  tags TEXT[] DEFAULT '{}',
  keywords TEXT DEFAULT '',
  uploader_name TEXT DEFAULT '',
  ocr_text TEXT DEFAULT '',
  ai_anomaly TEXT DEFAULT '',
  ai_anomaly_time TIMESTAMPTZ,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sheets_user ON public.sheets(user_id);
CREATE INDEX IF NOT EXISTS idx_sheets_subject ON public.sheets(subject);
CREATE INDEX IF NOT EXISTS idx_sheets_created ON public.sheets(created_at DESC);

-- Mistakes
CREATE TABLE IF NOT EXISTS public.mistakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT DEFAULT '',
  storage_path TEXT DEFAULT '',
  subject TEXT NOT NULL DEFAULT '其他',
  knowledge_points TEXT[] DEFAULT '{}',
  recognized_text TEXT DEFAULT '',
  wrong_reason TEXT DEFAULT '',
  correct_answer TEXT DEFAULT '',
  note TEXT DEFAULT '',
  keywords TEXT DEFAULT '',
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'ai_solve', 'ocr')),
  analysis TEXT DEFAULT '',
  steps TEXT[] DEFAULT '{}',
  answer TEXT DEFAULT '',
  content TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'solved', 'archived')),
  mastered BOOLEAN DEFAULT false,
  review_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mistakes_user ON public.mistakes(user_id);
CREATE INDEX IF NOT EXISTS idx_mistakes_subject ON public.mistakes(subject);
CREATE INDEX IF NOT EXISTS idx_mistakes_mastered ON public.mistakes(mastered);

-- OCR Results
CREATE TABLE IF NOT EXISTS public.ocr_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_image TEXT DEFAULT '',
  storage_path TEXT DEFAULT '',
  recognized_data JSONB DEFAULT '[]',
  corrected_data JSONB,
  excel_file TEXT DEFAULT '',
  excel_storage_path TEXT DEFAULT '',
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'corrected', 'exported')),
  row_count INTEGER DEFAULT 0,
  col_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ocr_user ON public.ocr_results(user_id);

-- Config
CREATE TABLE IF NOT EXISTS public.config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_role TEXT DEFAULT 'admin' CHECK (target_role IN ('admin', 'teacher', 'all')),
  user_name TEXT DEFAULT '',
  user_school TEXT DEFAULT '',
  user_phone TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Admin Logs
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id),
  admin_id UUID REFERENCES public.profiles(id),
  admin_name TEXT DEFAULT '',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON public.admin_logs(created_at DESC);

-- API Stats
CREATE TABLE IF NOT EXISTS public.api_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  model_name TEXT DEFAULT '',
  tokens_used INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_stats_type ON public.api_stats(service_type);
CREATE INDEX IF NOT EXISTS idx_api_stats_created ON public.api_stats(created_at);
