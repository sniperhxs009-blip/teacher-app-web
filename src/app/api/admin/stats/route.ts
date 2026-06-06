import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServiceClient()

  const [
    { data: users },
    { data: pending },
    { data: sheets },
    { data: mistakes },
  ] = await Promise.all([
    supabase.from('profiles').select('id'),
    supabase.from('profiles').select('id').eq('status', 'pending'),
    supabase.from('sheets').select('id'),
    supabase.from('mistakes').select('id'),
  ])

  return NextResponse.json({
    userCount: users?.length || 0,
    pendingCount: pending?.length || 0,
    sheetCount: sheets?.length || 0,
    mistakeCount: mistakes?.length || 0,
  })
}
