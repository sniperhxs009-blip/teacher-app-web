import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  let query = supabase.from('mistakes').select('*, profiles(nickname)', { count: 'exact' })
  if (search) {
    query = query.or(`subject.ilike.%${search}%,wrong_reason.ilike.%${search}%,keywords.ilike.%${search}%`)
  }
  const from = (page - 1) * limit
  const { data, count } = await query.order('created_at', { ascending: false }).range(from, from + limit - 1)

  return NextResponse.json({ data: data || [], count: count || 0 })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 })

  const { data: record } = await supabase.from('mistakes').select('storage_path').eq('id', id).single()
  if (record?.storage_path) {
    await supabase.storage.from('mistakes').remove([record.storage_path])
  }

  const { error } = await supabase.from('mistakes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('admin_logs').insert({
    action: 'delete_mistake',
    admin_id: auth.user.id,
    admin_name: auth.profile.nickname || '管理员',
    details: { mistake_id: id },
  })

  return NextResponse.json({ success: true })
}
