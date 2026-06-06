import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()

  const { data: sheet } = await supabase.from('sheets').select('storage_path').eq('id', params.id).single()
  if (!sheet) return NextResponse.json({ error: '未找到表格' }, { status: 404 })

  if (sheet.storage_path) {
    await supabase.storage.from('sheets').remove([sheet.storage_path])
  }

  const { error } = await supabase.from('sheets').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServiceClient()
  const body = await req.json()

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.title !== undefined) updateData.title = body.title
  if (body.subject !== undefined) updateData.subject = body.subject
  if (body.grade !== undefined) updateData.grade = body.grade
  if (body.examType !== undefined) updateData.exam_type = body.examType
  if (body.examDate !== undefined) updateData.exam_date = body.examDate || null
  if (body.keywords !== undefined) updateData.keywords = body.keywords
  if (body.download_count !== undefined) updateData.download_count = body.download_count

  const { error } = await supabase.from('sheets').update(updateData).eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
