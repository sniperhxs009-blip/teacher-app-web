import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApprovedUser, verifyResourceOwner } from '@/lib/api/auth'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApprovedUser()
  if (auth.error) return auth.error

  const isOwner = await verifyResourceOwner('mistakes', params.id, auth.user.id)
  if (!isOwner) return NextResponse.json({ error: '无权访问' }, { status: 403 })

  const supabase = createServiceClient()
  const { data } = await supabase.from('mistakes').select('*').eq('id', params.id).single()
  if (!data) return NextResponse.json({ error: '未找到' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApprovedUser()
  if (auth.error) return auth.error

  const isOwner = await verifyResourceOwner('mistakes', params.id, auth.user.id)
  if (!isOwner) return NextResponse.json({ error: '无权操作' }, { status: 403 })

  const supabase = createServiceClient()
  const body = await req.json()

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  const fields = ['subject', 'knowledge_points', 'wrong_reason', 'correct_answer', 'note', 'keywords', 'recognized_text', 'analysis', 'steps', 'answer', 'content', 'status', 'mastered', 'review_count']
  for (const f of fields) {
    if (body[f] !== undefined) updateData[f] = body[f]
  }
  if (body.mastered !== undefined) updateData.mastered = body.mastered
  if (body.last_reviewed_at) updateData.last_reviewed_at = body.last_reviewed_at

  const { error } = await supabase.from('mistakes').update(updateData).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireApprovedUser()
  if (auth.error) return auth.error

  const isOwner = await verifyResourceOwner('mistakes', params.id, auth.user.id)
  if (!isOwner) return NextResponse.json({ error: '无权操作' }, { status: 403 })

  const supabase = createServiceClient()
  const { data: m } = await supabase.from('mistakes').select('storage_path').eq('id', params.id).single()
  if (m?.storage_path) {
    await supabase.storage.from('mistakes').remove([m.storage_path])
  }
  const { error } = await supabase.from('mistakes').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
