import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createServiceClient()
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const search = url.searchParams.get('search')
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = 20

  let query = supabase.from('profiles').select('*', { count: 'exact' })
  if (status) query = query.eq('status', status)
  if (search) query = query.or(`nickname.ilike.%${search}%,real_name.ilike.%${search}%,phone.ilike.%${search}%`)
  query = query.order('register_time', { ascending: false }).range((page - 1) * limit, page * limit - 1)

  const { data, count } = await query
  return NextResponse.json({ data: data || [], total: count || 0 })
}

export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient()
  const body = await request.json()
  const { userId, status, rejectReason, role, adminName } = body

  if (!userId) return NextResponse.json({ error: '缺少用户ID' }, { status: 400 })

  const updateData: Record<string, string> = {}
  if (status) {
    updateData.status = status
    if (status === 'approved') updateData.approve_time = new Date().toISOString()
  }
  if (rejectReason !== undefined) updateData.reject_reason = rejectReason
  if (role) updateData.role = role

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('profiles') as any).update(updateData).eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('admin_logs').insert({
    action: status === 'approved' ? 'approve_user' : status === 'rejected' ? 'reject_user' : status === 'frozen' ? 'freeze_user' : 'update_user',
    target_user_id: userId,
    admin_name: adminName || '管理员',
    details: body,
  })

  return NextResponse.json({ success: true })
}
