import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const bucket = searchParams.get('bucket') || 'sheets'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20

  const tableMap: Record<string, { table: string; urlCol: string; pathCol: string; nameCol: string }> = {
    sheets: { table: 'sheets', urlCol: 'file_url', pathCol: 'storage_path', nameCol: 'title' },
    mistakes: { table: 'mistakes', urlCol: 'image_url', pathCol: 'storage_path', nameCol: 'content' },
    ocr: { table: 'ocr_results', urlCol: 'original_image', pathCol: 'storage_path', nameCol: 'id' },
  }

  const mapping = tableMap[bucket]
  if (!mapping) return NextResponse.json({ error: '无效的bucket' }, { status: 400 })

  const { table, urlCol, pathCol, nameCol } = mapping

  const from = (page - 1) * limit
  const { data, count, error } = await supabase
    .from(table)
    .select(`id, user_id, ${urlCol}, ${pathCol}, ${nameCol}, created_at, profiles!inner(nickname)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const files = (data || []).map((r: Record<string, unknown>) => ({
    id: r.id,
    user_id: r.user_id,
    nickname: (r.profiles as { nickname: string })?.nickname || '未知',
    url: r[urlCol],
    storage_path: r[pathCol],
    name: r[nameCol] || '未命名',
    created_at: r.created_at,
    bucket,
  }))

  return NextResponse.json({ data: files, total: count || 0, page, limit })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const supabase = createServiceClient()
  const { searchParams } = new URL(req.url)
  const bucket = searchParams.get('bucket')
  const storagePath = searchParams.get('path')
  const recordId = searchParams.get('id')

  if (!bucket || !storagePath || !recordId) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  const tableMap: Record<string, string> = {
    sheets: 'sheets',
    mistakes: 'mistakes',
    ocr: 'ocr_results',
  }

  const table = tableMap[bucket]
  if (!table) return NextResponse.json({ error: '无效的bucket' }, { status: 400 })

  // Delete from storage
  const { error: storageError } = await supabase.storage.from(bucket).remove([storagePath])
  if (storageError) {
    return NextResponse.json({ error: `删除文件失败: ${storageError.message}` }, { status: 500 })
  }

  // Also delete associated DB record
  await supabase.from(table).delete().eq('id', recordId)

  await supabase.from('admin_logs').insert({
    action: 'delete_file',
    admin_id: auth.user.id,
    admin_name: auth.profile.nickname || '管理员',
    details: { bucket, storage_path: storagePath, record_id: recordId },
  })

  return NextResponse.json({ success: true })
}
