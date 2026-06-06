import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export interface AuthUser {
  id: string
  email?: string
}

export interface UserProfile {
  id: string
  role: string
  status: string
  nickname: string
  real_name: string
  school: string
  subject: string
  phone: string
  reject_reason: string
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { id: user.id, email: user.email }
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createServiceClient()
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data as UserProfile | null
}

export async function requireAuth(): Promise<
  { user: AuthUser; error?: never } | { user?: never; error: NextResponse }
> {
  const user = await getAuthUser()
  if (!user) {
    return { error: NextResponse.json({ error: '未登录' }, { status: 401 }) }
  }
  return { user }
}

export async function requireApprovedUser(): Promise<
  { user: AuthUser; profile: UserProfile; error?: never } | { user?: never; profile?: never; error: NextResponse }
> {
  const auth = await requireAuth()
  if (auth.error) return auth

  const profile = await getProfile(auth.user.id)
  if (!profile) {
    return { error: NextResponse.json({ error: '用户不存在' }, { status: 404 }) }
  }
  if (profile.status === 'frozen') {
    return { error: NextResponse.json({ error: '账号已被冻结，请联系管理员' }, { status: 403 }) }
  }
  if (profile.status === 'rejected') {
    return { error: NextResponse.json({ error: '账号审核未通过' }, { status: 403 }) }
  }
  if (profile.status === 'pending') {
    return { error: NextResponse.json({ error: '账号审核中，请等待管理员审核' }, { status: 403 }) }
  }
  return { user: auth.user, profile }
}

export async function requireAdmin(): Promise<
  { user: AuthUser; profile: UserProfile; error?: never } | { user?: never; profile?: never; error: NextResponse }
> {
  const auth = await requireAuth()
  if (auth.error) return auth

  const profile = await getProfile(auth.user.id)
  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return { error: NextResponse.json({ error: '无权限' }, { status: 403 }) }
  }
  return { user: auth.user, profile }
}

export async function verifyResourceOwner(
  table: 'mistakes' | 'sheets' | 'ocr_results',
  resourceId: string,
  userId: string,
): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase.from(table).select('user_id').eq('id', resourceId).single()
  return data?.user_id === userId
}
