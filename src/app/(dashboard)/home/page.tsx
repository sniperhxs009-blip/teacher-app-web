'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { FileSpreadsheet, BookOpen, Camera, Sparkles, TrendingUp, ChevronRight } from 'lucide-react'

export default function HomePage() {
  const [profile, setProfile] = useState<{ nickname: string; role: string } | null>(null)
  const [stats, setStats] = useState({ sheets: 0, mistakes: 0, mastered: 0 })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, statsRes] = await Promise.all([
        fetch(`/api/user/profile?userId=${user.id}`),
        fetch(`/api/user/stats?userId=${user.id}`),
      ])

      if (profileRes.ok) {
        const { data: p } = await profileRes.json()
        if (p) setProfile(p)
      }

      if (statsRes.ok) {
        const s = await statsRes.json()
        setStats({ sheets: s.sheets || 0, mistakes: s.mistakes || 0, mastered: s.mastered || 0 })
      }
    }
    load()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好'

  const actions = [
    { href: '/sheets', label: '表格库', desc: '试卷表格', icon: FileSpreadsheet, bg: 'bg-blue-50', text: 'text-blue-600' },
    { href: '/mistakes', label: '错题本', desc: '错题记录', icon: BookOpen, bg: 'bg-orange-50', text: 'text-orange-600' },
    { href: '/camera', label: '拍照识别', desc: 'OCR表格', icon: Camera, bg: 'bg-green-50', text: 'text-green-600' },
    { href: '/ai-solve', label: 'AI解题', desc: '智能分析', icon: Sparkles, bg: 'bg-purple-50', text: 'text-purple-600' },
  ]

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl px-5 py-5 text-white shadow-lg shadow-blue-200/40">
        <p className="text-blue-100 text-[13px]">{greeting}</p>
        <h1 className="text-[22px] font-bold mt-0.5">{profile?.nickname || '教师'}</h1>
        <div className="flex gap-3 mt-4">
          {[
            { v: stats.sheets, l: '表格' },
            { v: stats.mistakes, l: '错题' },
            { v: stats.mastered, l: '已掌握' },
          ].map(s => (
            <div key={s.l} className="flex-1 bg-white/15 rounded-xl py-2.5 text-center">
              <p className="text-xl font-bold">{s.v}</p>
              <p className="text-[11px] text-blue-100 mt-0.5">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {actions.map(a => {
          const Icon = a.icon
          return (
            <Link key={a.href} href={a.href}
              className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-3">
              <div className={`w-[42px] h-[42px] rounded-xl flex items-center justify-center flex-shrink-0 ${a.bg}`}>
                <Icon className={`w-[20px] h-[20px] ${a.text}`} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[15px] text-gray-800">{a.label}</p>
                <p className="text-[12px] text-gray-400 mt-0.5">{a.desc}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Review Entry */}
      <Link href="/mistakes/review"
        className="bg-white rounded-2xl px-4 py-4 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-3">
        <div className="w-[42px] h-[42px] bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-[20px] h-[20px] text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[15px] text-gray-800">错题复习</p>
          <p className="text-[12px] text-gray-400 mt-0.5">卡片式复习未掌握的错题</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
      </Link>

      {profile?.role === 'admin' && (
        <Link href="/admin/dashboard"
          className="block w-full py-3 bg-white rounded-2xl text-center text-[14px] text-blue-600 font-medium shadow-sm active:scale-[0.98] transition-transform">
          进入管理后台
        </Link>
      )}
    </div>
  )
}
