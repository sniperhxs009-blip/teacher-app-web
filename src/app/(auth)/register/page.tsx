'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ nickname: '', email: '', phone: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  function update(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error('两次密码不一致'); return }
    if (form.password.length < 6) { toast.error('密码至少6位'); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { nickname: form.nickname, phone: form.phone } },
      })
      if (error) {
        toast.error(error.message.includes('already') ? '该邮箱已被注册' : error.message)
        return
      }

      const userId = data.user?.id
      if (userId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('profiles') as any).update({
          status: 'approved',
          approve_time: new Date().toISOString(),
        }).eq('id', userId)
      }

      toast.success('注册成功！')
      router.push('/home')
      router.refresh()
    } catch { toast.error('注册失败') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-slate-50 via-white to-gray-100">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl mx-auto flex items-center justify-center shadow-[0_8px_32px_rgba(99,102,241,0.35)]">
            <span className="text-white text-4xl font-black">教</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-5 tracking-tight">创建账号</h1>
          <p className="text-sm text-gray-400 mt-1.5 font-medium">注册教师助手</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-3">
          <input type="text" required value={form.nickname} onChange={e => update('nickname', e.target.value)} className="input-base" placeholder="昵称" />
          <input type="email" required value={form.email} onChange={e => update('email', e.target.value)} className="input-base" placeholder="邮箱" inputMode="email" autoComplete="email" />
          <input type="tel" required value={form.phone} onChange={e => update('phone', e.target.value)} className="input-base" placeholder="手机号" maxLength={11} />
          <input type="password" required value={form.password} onChange={e => update('password', e.target.value)} className="input-base" placeholder="密码（至少6位）" autoComplete="new-password" />
          <input type="password" required value={form.confirm} onChange={e => update('confirm', e.target.value)} className="input-base" placeholder="确认密码" autoComplete="new-password" />
          <button type="submit" disabled={loading}
            className="btn-primary flex items-center justify-center gap-2 mt-1">
            <UserPlus className="w-[18px] h-[18px]" />
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="text-sm text-gray-400 mt-5 text-center font-medium">
          已有账号？<Link href="/login" className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors">去登录</Link>
        </p>
      </div>
    </div>
  )
}
