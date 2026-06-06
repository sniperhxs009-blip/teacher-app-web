import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20

  const from = (page - 1) * limit
  const { data, count, error } = await supabase
    .from('ocr_results')
    .select('*, profiles!inner(nickname)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data || [], total: count || 0, page, limit })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '缺少id' }, { status: 400 })

  const { data: record } = await supabase.from('ocr_results').select('storage_path, excel_storage_path').eq('id', id).single()

  if (record?.storage_path) {
    await supabase.storage.from('ocr').remove([record.storage_path])
  }
  if (record?.excel_storage_path) {
    await supabase.storage.from('ocr').remove([record.excel_storage_path])
  }

  const { error } = await supabase.from('ocr_results').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('admin_logs').insert({
    action: 'delete_ocr',
    admin_id: auth.user.id,
    admin_name: auth.profile.nickname || '管理员',
    details: { ocr_id: id },
  })

  return NextResponse.json({ success: true })
}
