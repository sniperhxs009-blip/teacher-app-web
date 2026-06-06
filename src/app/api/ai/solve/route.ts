import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireApprovedUser } from '@/lib/api/auth'

export async function POST(req: NextRequest) {
  const auth = await requireApprovedUser()
  if (auth.error) return auth.error

  try {
    const body = await req.json()
    const { imageUrl, storagePath } = body

    if (!imageUrl) {
      return NextResponse.json({ error: '缺少图片参数' }, { status: 400 })
    }

    const imageRes = await fetch(imageUrl)
    if (!imageRes.ok) {
      return NextResponse.json({ error: '无法读取上传的图片' }, { status: 400 })
    }
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer())
    const imageBase64 = imageBuffer.toString('base64')

    const { solveImage } = await import('@/lib/ai/doubao')
    const result = await solveImage(imageBase64)

    const supabase = createServiceClient()
    const { data: mistake, error } = await supabase.from('mistakes').insert({
      user_id: auth.user.id,
      image_url: imageUrl,
      storage_path: storagePath || '',
      subject: result.subject || '其他',
      knowledge_points: result.knowledgePoints || [],
      analysis: result.analysis,
      steps: result.steps,
      answer: result.answer,
      source: 'ai_solve',
    }).select().single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ data: mistake })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI解题失败'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
