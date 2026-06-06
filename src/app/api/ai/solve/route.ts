import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApprovedUser } from '@/lib/api/auth'
import sharp from 'sharp'

export async function POST(req: NextRequest) {
  const auth = await requireApprovedUser()
  if (auth.error) return auth.error

  try {
    const body = await req.json()
    const { imageUrl, storagePath, imageBase64: inputBase64 } = body

    if (!imageUrl) {
      return NextResponse.json({ error: '缺少图片参数' }, { status: 400 })
    }

    let imageBuffer: Buffer
    if (inputBase64) {
      imageBuffer = Buffer.from(inputBase64, 'base64')
    } else {
      const imageRes = await fetch(imageUrl)
      if (!imageRes.ok) {
        return NextResponse.json({ error: '无法读取上传的图片' }, { status: 400 })
      }
      imageBuffer = Buffer.from(await imageRes.arrayBuffer())
    }

    try {
      imageBuffer = await sharp(imageBuffer)
        .resize(500, 500, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 50 })
        .toBuffer()
    } catch {
      // keep original if sharp fails
    }

    const imageBase64 = imageBuffer.toString('base64')

    const { solveImage } = await import('@/lib/ai/doubao')
    const results = await solveImage(imageBase64)

    const supabase = createServiceClient()
    const mistakes = []

    for (const result of results) {
      const { data: mistake, error } = await supabase.from('mistakes').insert({
        user_id: auth.user.id,
        image_url: imageUrl,
        storage_path: storagePath || '',
        subject: result.subject || '其他',
        knowledge_point: (result.knowledgePoints || []).join(', '),
        analysis: result.analysis,
        solution_steps: (result.steps || []).join('\n'),
        correct_answer: result.answer,
        keywords: (result.knowledgePoints || []).join(','),
      }).select().single()

      if (error) throw new Error(error.message)
      mistakes.push(mistake)
    }

    return NextResponse.json({ data: mistakes })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI解题失败'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
