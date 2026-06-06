import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApprovedUser, verifyResourceOwner } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const auth = await requireApprovedUser()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 })

  const isOwner = await verifyResourceOwner('ocr_results', id, auth.user.id)
  if (!isOwner) return NextResponse.json({ error: '无权访问' }, { status: 403 })

  const supabase = createServiceClient()
  const { data } = await supabase.from('ocr_results').select('*').eq('id', id).single()
  if (!data) return NextResponse.json({ error: '未找到' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireApprovedUser()
  if (auth.error) return auth.error

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 })

  const isOwner = await verifyResourceOwner('ocr_results', id, auth.user.id)
  if (!isOwner) return NextResponse.json({ error: '无权操作' }, { status: 403 })

  const supabase = createServiceClient()
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.corrected_data !== undefined) updateData.corrected_data = updates.corrected_data
  if (updates.status !== undefined) updateData.status = updates.status

  const { error } = await supabase.from('ocr_results').update(updateData).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
