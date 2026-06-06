import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api/auth'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = createServiceClient()

  const [
    { data: users },
    { data: pending },
    { data: approved },
    { data: sheets },
    { data: mistakes },
    { data: ocr },
  ] = await Promise.all([
    supabase.from('profiles').select('id'),
    supabase.from('profiles').select('id').eq('status', 'pending'),
    supabase.from('profiles').select('id').eq('status', 'approved'),
    supabase.from('sheets').select('id'),
    supabase.from('mistakes').select('id'),
    supabase.from('ocr_results').select('id'),
  ])

  return NextResponse.json({
    userCount: users?.length || 0,
    pendingCount: pending?.length || 0,
    approvedCount: approved?.length || 0,
    sheetCount: sheets?.length || 0,
    mistakeCount: mistakes?.length || 0,
    ocrCount: ocr?.length || 0,
  })
}
