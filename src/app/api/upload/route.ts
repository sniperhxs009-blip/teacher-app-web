import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApprovedUser } from '@/lib/api/auth'

const ALLOWED_BUCKETS = ['mistakes', 'ocr', 'sheets'] as const
type Bucket = typeof ALLOWED_BUCKETS[number]

export async function POST(req: NextRequest) {
  const auth = await requireApprovedUser()
  if (auth.error) return auth.error

  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const bucket = form.get('bucket') as string

    if (!file || !bucket || !ALLOWED_BUCKETS.includes(bucket as Bucket)) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const storagePath = `${auth.user.id}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const contentType = file.type || (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'application/octet-stream')

    const supabase = createServiceClient()
    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
      contentType,
      upsert: false,
    })

    if (uploadError) {
      return NextResponse.json({ error: `上传失败: ${uploadError.message}` }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath)
    return NextResponse.json({
      publicUrl: urlData.publicUrl,
      storagePath,
      bucket,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '上传失败'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
