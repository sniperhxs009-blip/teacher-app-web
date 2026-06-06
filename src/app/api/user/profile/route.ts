import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: '缺少userId' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()

  if (!profile) return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  return NextResponse.json({ data: profile })
}
