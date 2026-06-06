import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageUrl, storagePath, userId } = body

    if (!imageUrl || !userId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    // Download image & convert to base64
    const imageRes = await fetch(imageUrl)
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer())
    const imageBase64 = imageBuffer.toString('base64')

    // Call Doubao Vision
    const { solveImage } = await import('@/lib/ai/doubao')
    const result = await solveImage(imageBase64)

    // Save as mistake with AI analysis
    const supabase = createServiceClient()
    const { data: mistake, error } = await supabase.from('mistakes').insert({
      user_id: userId,
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
