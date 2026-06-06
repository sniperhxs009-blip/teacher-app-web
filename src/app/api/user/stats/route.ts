import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApprovedUser } from '@/lib/api/auth'

export async function GET() {
  const auth = await requireApprovedUser()
  if (auth.error) return auth.error

  const supabase = createServiceClient()
  const userId = auth.user.id

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
