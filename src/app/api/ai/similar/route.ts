import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { subject, knowledgePoints, answer } = body

    const { generateSimilarQuestions } = await import('@/lib/ai/deepseek')
    const result = await generateSimilarQuestions(subject, knowledgePoints, answer)

    return NextResponse.json({ data: result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '生成失败'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
