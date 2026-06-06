'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

  if (status === 'loading') {
    return (
      <div className="text-center py-10">
        <div className="animate-spin w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-[14px] text-gray-400 mt-4">加载中...</p>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="text-center">
        <div className="w-[72px] h-[72px] bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg shadow-yellow-200/50">
          <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-[22px] font-bold text-gray-900">等待审核</h1>
        <p className="text-[14px] text-gray-400 mt-2 mb-8 leading-relaxed">
          账号已注册成功，等待管理员审核后即可使用。
        </p>
        <button
          onClick={handleLogout}
          className="w-full h-[50px] border-2 border-gray-200 rounded-xl text-[15px] text-gray-500 font-medium active:scale-[0.98] transition-transform"
        >
          退出登录
        </button>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="text-center">
        <div className="w-[72px] h-[72px] bg-gradient-to-br from-red-400 to-red-600 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg shadow-red-200/50">
          <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-[22px] font-bold text-gray-900">审核未通过</h1>
        <p className="text-[14px] text-gray-400 mt-2 mb-4">很遗憾，您的账号审核未通过。</p>
        {reason && (
          <p className="text-[14px] text-red-600 bg-red-50 rounded-xl p-4 mb-6">
            原因：{reason}
          </p>
        )}
        <button
          onClick={handleLogout}
          className="w-full h-[50px] border-2 border-gray-200 rounded-xl text-[15px] text-gray-500 font-medium active:scale-[0.98] transition-transform"
        >
          退出登录
        </button>
      </div>
    )
  }

  if (status === 'frozen') {
    return (
      <div className="text-center">
        <div className="w-[72px] h-[72px] bg-gradient-to-br from-gray-400 to-gray-600 rounded-2xl mx-auto mb-5 flex items-center justify-center shadow-lg">
          <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-[22px] font-bold text-gray-900">账号已冻结</h1>
        <p className="text-[14px] text-gray-400 mt-2 mb-8 leading-relaxed">
          您的账号已被管理员冻结，请联系管理员处理。
        </p>
        <button
          onClick={handleLogout}
          className="w-full h-[50px] border-2 border-gray-200 rounded-xl text-[15px] text-gray-500 font-medium active:scale-[0.98] transition-transform"
        >
          退出登录
        </button>
      </div>
    )
  }

  return null
}
