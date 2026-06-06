import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api/auth'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = createServiceClient()
  const { data } = await supabase.from('config').select('*').order('key')
  return NextResponse.json({ data: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = createServiceClient()
  const body = await req.json()
  const { key, value } = body
  if (!key) return NextResponse.json({ error: '缺少key' }, { status: 400 })

  const { data: existing } = await supabase.from('config').select('id').eq('key', key).single()

  if (existing) {
    const { error } = await supabase.from('config').update({ value, updated_at: new Date().toISOString() }).eq('key', key)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('config').insert({ key, value: value || '' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.from('admin_logs').insert({
    action: 'update_config',
    admin_id: auth.user.id,
    admin_name: auth.profile.nickname || '管理员',
    details: { key, value: value ? '***' : '' },
  })

  return NextResponse.json({ success: true })
}
