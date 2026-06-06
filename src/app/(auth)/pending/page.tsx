'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Clock, XCircle, Lock, LogOut } from 'lucide-react'

export default function PendingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'pending' | 'rejected' | 'frozen'>('loading')
  const [reason, setReason] = useState('')

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch(`/api/user/profile?userId=${user.id}`)
      if (!res.ok) { router.push('/login'); return }

      const { data: profile } = await res.json()
      if (!profile) { router.push('/login'); return }

      if (profile.status === 'approved') {
        if (profile.role === 'admin' || profile.role === 'super_admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/home')
        }
        return
      }

      setStatus(profile.status as typeof status)
      if (profile.status === 'rejected') setReason(profile.reject_reason || '')
    }
    check()
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const configs = {
    pending: {
      icon: Clock,
      gradient: 'from-amber-400 to-orange-500',
      shadow: 'shadow-[0_8px_32px_rgba(245,158,11,0.3)]',
      title: '等待审核',
      desc: '账号已注册成功，等待管理员审核后即可使用。',
    },
    rejected: {
      icon: XCircle,
      gradient: 'from-red-400 to-rose-500',
      shadow: 'shadow-[0_8px_32px_rgba(244,63,94,0.3)]',
      title: '审核未通过',
      desc: '很遗憾，您的账号审核未通过。',
    },
    frozen: {
      icon: Lock,
      gradient: 'from-gray-400 to-gray-600',
      shadow: 'shadow-[0_8px_32px_rgba(107,114,128,0.3)]',
      title: '账号已冻结',
      desc: '您的账号已被管理员冻结，请联系管理员处理。',
    },
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">加载中...</p>
        </div>
      </div>
    )
  }

  const cfg = configs[status]
  if (!cfg) return null

  const Icon = cfg.icon

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-slate-50 via-white to-gray-100">
      <div className="w-full max-w-sm text-center">
        <div className={`w-20 h-20 bg-gradient-to-br ${cfg.gradient} rounded-3xl mx-auto flex items-center justify-center ${cfg.shadow}`}>
          <Icon className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-5">{cfg.title}</h1>
        <p className="text-sm text-gray-500 mt-3 mb-8 leading-relaxed px-2">{cfg.desc}</p>

        {status === 'rejected' && reason && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-6 text-left">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">拒绝原因</p>
            <p className="text-sm text-red-700 font-medium">{reason}</p>
          </div>
        )}

        <button onClick={handleLogout}
          className="btn-secondary flex items-center justify-center gap-2">
          <LogOut className="w-[18px] h-[18px]" />
          退出登录
        </button>
      </div>
    </div>
  )
}
