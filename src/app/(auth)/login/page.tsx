'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { LogIn } from 'lucide-react'

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
        setLoading(false)
        return
      }

      // Check role for correct redirect (use cached role if available)
      const cachedRole = (() => { try { return sessionStorage.getItem('user_role') } catch { return null } })()
      if (cachedRole === 'admin' || cachedRole === 'super_admin') {
        toast.success('登录成功')
        router.push('/admin/dashboard')
      } else {
        const userId = data.user?.id
        const res = await fetch(`/api/user/profile?userId=${userId}`)
        const { data: profile } = await res.json().catch(() => ({}))
        const role = profile?.role
        if (role) { try { sessionStorage.setItem('user_role', role) } catch { /* */ } }
        toast.success('登录成功')
        router.push(role === 'admin' || role === 'super_admin' ? '/admin/dashboard' : '/home')
      }
      router.refresh()
    } catch { toast.error('登录失败，请重试') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-slate-50 via-white to-gray-100">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl mx-auto flex items-center justify-center shadow-[0_8px_32px_rgba(99,102,241,0.35)]">
            <span className="text-white text-4xl font-black">教</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-5 tracking-tight">教师助手</h1>
          <p className="text-sm text-gray-400 mt-1.5 font-medium">教师教学好帮手</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3.5">
          <input
            type="email" required value={email} inputMode="email" autoComplete="email"
            onChange={e => setEmail(e.target.value)}
            className="input-base" placeholder="邮箱"
          />
          <input
            type="password" required value={password} autoComplete="current-password"
            onChange={e => setPassword(e.target.value)}
            className="input-base" placeholder="密码"
          />
          <button type="submit" disabled={loading}
            className="btn-primary flex items-center justify-center gap-2">
            <LogIn className="w-[18px] h-[18px]" />
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="text-sm text-gray-400 mt-6 text-center font-medium">
          还没有账号？{' '}
          <Link href="/register" className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors">立即注册</Link>
        </p>
      </div>
    </div>
  )
}
