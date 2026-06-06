import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: '缺少userId' }, { status: 400 })

  const supabase = createServiceClient()
  const [
    { data: sheets },
    { data: mistakes },
    { data: mastered },
  ] = await Promise.all([
    supabase.from('sheets').select('id').eq('user_id', userId),
    supabase.from('mistakes').select('id').eq('user_id', userId),
    supabase.from('mistakes').select('id').eq('user_id', userId).eq('mastered', true),
  ])

  return NextResponse.json({
    sheets: sheets?.length || 0,
    mistakes: mistakes?.length || 0,
    mastered: mastered?.length || 0,
  })
}
