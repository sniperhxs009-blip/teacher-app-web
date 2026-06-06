'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { LogOut, User, Phone, School, Shield, CircleCheck } from 'lucide-react'

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: '已通过', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  pending: { label: '审核中', color: 'text-amber-600', bg: 'bg-amber-50' },
  frozen: { label: '已冻结', color: 'text-blue-600', bg: 'bg-blue-50' },
  rejected: { label: '未通过', color: 'text-red-600', bg: 'bg-red-50' },
}

const roleMap: Record<string, string> = {
  teacher: '教师',
  admin: '管理员',
  super_admin: '超级管理员',
}

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
        <div className="animate-spin w-8 h-8 border-[3px] border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const st = statusMap[profile.status] || statusMap.approved

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">我的</h1>

      {/* Avatar Card */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-[0_4px_16px_rgba(99,102,241,0.3)] flex-shrink-0">
          {profile.nickname?.[0] || '教'}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-extrabold text-gray-800">{profile.nickname}</p>
          <p className="text-sm text-gray-400 mt-0.5 font-medium">{profile.school || '未填写学校'} · {profile.subject || '未填写科目'}</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="card overflow-hidden divide-y divide-gray-50">
        {[
          { icon: User, label: '真实姓名', value: profile.real_name || '-' },
          { icon: Phone, label: '手机号', value: profile.phone || '-' },
          { icon: School, label: '学校', value: profile.school || '-' },
          { icon: Shield, label: '角色', value: roleMap[profile.role] || profile.role || '-' },
          { icon: CircleCheck, label: '状态', value: st.label, valueColor: st.color, valueBg: st.bg, badge: true },
        ].map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} className="flex items-center justify-between px-5 h-[54px]">
              <div className="flex items-center gap-3 text-gray-500">
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              {item.badge ? (
                <span className={`tag ${item.valueColor} ${item.valueBg}`}>{item.value}</span>
              ) : (
                <span className="text-sm text-gray-800 font-semibold">{item.value}</span>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={handleLogout}
        className="w-full h-[52px] bg-red-50 text-red-600 rounded-2xl text-[15px] font-bold active:scale-[0.98] transition-all duration-200 hover:bg-red-100 flex items-center justify-center gap-2">
        <LogOut className="w-[18px] h-[18px]" />
        退出登录
      </button>
    </div>
  )
}
