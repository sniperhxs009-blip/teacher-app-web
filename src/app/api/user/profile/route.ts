import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api/auth'
import { getProfile } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth.error) return auth.error

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || auth.user.id

  if (userId !== auth.user.id) {
    return NextResponse.json({ error: '无权访问' }, { status: 403 })
  }

  const profile = await getProfile(userId)
  if (!profile) return NextResponse.json({ error: '用户不存在' }, { status: 404 })
  return NextResponse.json({ data: profile })
}
