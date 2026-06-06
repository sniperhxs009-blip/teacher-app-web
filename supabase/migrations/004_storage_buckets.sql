-- Storage buckets for image/file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('mistakes', 'mistakes', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('ocr', 'ocr', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('sheets', 'sheets', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Authenticated users can upload to their own folder: {userId}/...
DROP POLICY IF EXISTS "Users upload own files" ON storage.objects;
CREATE POLICY "Users upload own files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('mistakes', 'ocr', 'sheets')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users update own files" ON storage.objects;
CREATE POLICY "Users update own files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('mistakes', 'ocr', 'sheets')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users delete own files" ON storage.objects;
CREATE POLICY "Users delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('mistakes', 'ocr', 'sheets')
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read (server fetches images via public URL for OCR/AI)
DROP POLICY IF EXISTS "Public read storage files" ON storage.objects;
CREATE POLICY "Public read storage files" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id IN ('mistakes', 'ocr', 'sheets'));

-- Service role full access (for server-side uploads via API)
DROP POLICY IF EXISTS "Service role full storage access" ON storage.objects;
CREATE POLICY "Service role full storage access" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id IN ('mistakes', 'ocr', 'sheets'))
  WITH CHECK (bucket_id IN ('mistakes', 'ocr', 'sheets'));
