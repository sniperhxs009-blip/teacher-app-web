'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

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
      const { error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { nickname: form.nickname, phone: form.phone } },
      })
      if (error) {
        toast.error(error.message.includes('already') ? '该邮箱已被注册' : error.message)
        return
      }

      toast.success('注册成功，等待管理员审核')
      router.push('/pending')
      router.refresh()
    } catch { toast.error('注册失败') }
    finally { setLoading(false) }
  }

  const inputClass = "w-full h-[50px] px-4 bg-gray-50 border-0 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"

  return (
    <div className="text-center">
      <div className="w-[72px] h-[72px] bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg shadow-blue-200/50">
        <span className="text-white text-3xl font-bold">教</span>
      </div>
      <h1 className="text-[22px] font-bold text-gray-900">创建账号</h1>
      <p className="text-[13px] text-gray-400 mt-1 mb-6">注册教师助手</p>

      <form onSubmit={handleRegister} className="space-y-3 text-left">
        <input type="text" required value={form.nickname} onChange={e => update('nickname', e.target.value)} className={inputClass} placeholder="昵称" />
        <input type="email" required value={form.email} onChange={e => update('email', e.target.value)} className={inputClass} placeholder="邮箱" inputMode="email" autoComplete="email" />
        <input type="tel" required value={form.phone} onChange={e => update('phone', e.target.value)} className={inputClass} placeholder="手机号" maxLength={11} />
        <input type="password" required value={form.password} onChange={e => update('password', e.target.value)} className={inputClass} placeholder="密码（至少6位）" autoComplete="new-password" />
        <input type="password" required value={form.confirm} onChange={e => update('confirm', e.target.value)} className={inputClass} placeholder="确认密码" autoComplete="new-password" />
        <button type="submit" disabled={loading}
          className="w-full h-[50px] bg-blue-600 text-white rounded-xl text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-blue-200/50">
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <p className="text-[13px] text-gray-400 mt-5">
        已有账号？<Link href="/login" className="text-blue-600 font-semibold">去登录</Link>
      </p>
    </div>
  )
}
