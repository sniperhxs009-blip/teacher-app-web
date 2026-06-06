'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Record<string, string> | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const res = await fetch(`/api/user/profile?userId=${user.id}`)
      if (res.ok) {
        const { data: p } = await res.json()
        if (p) setProfile(p)
      }
    }
    load()
  }, [])

  async function handleLogout() {
    if (!confirm('确定退出登录？')) return
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('已退出登录')
    router.push('/login')
    router.refresh()
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">我的</h1>

      {/* Avatar Card */}
      <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
        <div className="w-[60px] h-[60px] bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-[24px] font-bold shadow-lg shadow-blue-200/50 flex-shrink-0">
          {profile.nickname?.[0] || '教'}
        </div>
        <div className="min-w-0">
          <p className="text-[17px] font-bold text-gray-800">{profile.nickname}</p>
          <p className="text-[13px] text-gray-400 mt-0.5">{profile.school || '未填写学校'} · {profile.subject || '未填写科目'}</p>
        </div>
      </div>

      {/* Info List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 h-[52px]">
          <span className="text-[14px] text-gray-500">真实姓名</span>
          <span className="text-[14px] text-gray-800 font-medium">{profile.real_name || '-'}</span>
        </div>
        <div className="flex items-center justify-between px-5 h-[52px] border-t border-gray-50">
          <span className="text-[14px] text-gray-500">手机号</span>
          <span className="text-[14px] text-gray-800 font-medium">{profile.phone || '-'}</span>
        </div>
        <div className="flex items-center justify-between px-5 h-[52px] border-t border-gray-50">
          <span className="text-[14px] text-gray-500">角色</span>
          <span className="text-[14px] text-gray-800 font-medium">{profile.role === 'teacher' ? '教师' : profile.role === 'admin' ? '管理员' : '超级管理员'}</span>
        </div>
        <div className="flex items-center justify-between px-5 h-[52px] border-t border-gray-50">
          <span className="text-[14px] text-gray-500">状态</span>
          <span className={`text-[14px] font-semibold ${profile.status === 'approved' ? 'text-green-600' : profile.status === 'pending' ? 'text-yellow-600' : profile.status === 'frozen' ? 'text-blue-600' : 'text-red-600'}`}>
            {profile.status === 'approved' ? '已通过' : profile.status === 'pending' ? '审核中' : profile.status === 'frozen' ? '已冻结' : '未通过'}
          </span>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="w-full h-[50px] bg-red-50 text-red-600 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform"
      >
        退出登录
      </button>
    </div>
  )
}
