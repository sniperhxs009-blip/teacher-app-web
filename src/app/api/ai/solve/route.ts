import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApprovedUser } from '@/lib/api/auth'
import sharp from 'sharp'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

async function compressImage(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .rotate()
      .resize(960, 960, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 45, mozjpeg: true })
      .toBuffer()
  } catch {
    return buffer
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireApprovedUser()
  if (auth.error) return auth.error

  try {
    const body = await req.json()
    const { imageUrl, storagePath, imageBase64: inputBase64 } = body

    if (!imageUrl && !inputBase64) {
      return NextResponse.json({ error: '缺少图片参数' }, { status: 400 })
    }

    let imageBuffer: Buffer
    if (inputBase64) {
      imageBuffer = Buffer.from(inputBase64, 'base64')
    } else {
      const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) })
      if (!imageRes.ok) return NextResponse.json({ error: '无法读取上传的图片' }, { status: 400 })
      imageBuffer = Buffer.from(await imageRes.arrayBuffer())
    }

    imageBuffer = await compressImage(imageBuffer)
    const imageBase64 = imageBuffer.toString('base64')

    const { solveImage } = await import('@/lib/ai/doubao')
    const results = await solveImage(imageBase64)

    const supabase = createServiceClient()
    const rows = results.map(result => ({
      user_id: auth.user.id,
      image_url: imageUrl || '',
      storage_path: storagePath || '',
      subject: result.subject || '其他',
      knowledge_points: result.knowledgePoints || [],
      analysis: result.analysis || '',
      steps: result.steps || [],
      answer: result.answer || '',
      source: 'ai_solve' as const,
      keywords: (result.knowledgePoints || []).join(','),
    }))

    const { data: mistakes, error } = await supabase.from('mistakes').insert(rows).select()
    if (error) throw new Error(error.message)

    return NextResponse.json({ data: mistakes })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI解题失败'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
