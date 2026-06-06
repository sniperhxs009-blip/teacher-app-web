'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

function getRedirectPath(profile: { role: string; status: string }) {
  if (profile.status === 'pending' || profile.status === 'rejected' || profile.status === 'frozen') {
    return '/pending'
  }
  if (profile.role === 'admin' || profile.role === 'super_admin') {
    return '/admin/dashboard'
  }
  return '/home'
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { toast.error('请填写邮箱和密码'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast.error(error.message.includes('Invalid') ? '邮箱或密码错误' : error.message)
        return
      }

      const userId = data.user?.id
      if (userId) {
        const res = await fetch(`/api/user/profile?userId=${userId}`)
        const { data: profile } = await res.json()
        toast.success('登录成功')
        router.push(profile ? getRedirectPath(profile) : '/home')
      } else {
        router.push('/home')
      }
      router.refresh()
    } catch { toast.error('登录失败，请重试') }
    finally { setLoading(false) }
  }

  return (
    <div className="text-center">
      <div className="w-[72px] h-[72px] bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg shadow-blue-200/50">
        <span className="text-white text-3xl font-bold">教</span>
      </div>
      <h1 className="text-[22px] font-bold text-gray-900">教师助手</h1>
      <p className="text-[13px] text-gray-400 mt-1 mb-7">教师教学好帮手</p>

      <form onSubmit={handleLogin} className="space-y-3.5 text-left">
        <div>
          <input
            type="email" required value={email} inputMode="email" autoComplete="email"
            onChange={e => setEmail(e.target.value)}
            className="w-full h-[50px] px-4 bg-gray-50 border-0 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            placeholder="邮箱"
          />
        </div>
        <div>
          <input
            type="password" required value={password} autoComplete="current-password"
            onChange={e => setPassword(e.target.value)}
            className="w-full h-[50px] px-4 bg-gray-50 border-0 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            placeholder="密码"
          />
        </div>
        <button type="submit" disabled={loading}
          className="w-full h-[50px] bg-blue-600 text-white rounded-xl text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-blue-200/50">
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <p className="text-[13px] text-gray-400 mt-6">
        还没有账号？{' '}
        <Link href="/register" className="text-blue-600 font-semibold">立即注册</Link>
      </p>
    </div>
  )
}
