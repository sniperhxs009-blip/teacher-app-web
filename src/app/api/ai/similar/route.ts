import { NextRequest, NextResponse } from 'next/server'
import { requireApprovedUser } from '@/lib/api/auth'

export async function POST(req: NextRequest) {
  const auth = await requireApprovedUser()
  if (auth.error) return auth.error

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
