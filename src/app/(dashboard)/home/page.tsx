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
    { href: '/sheets', label: '表格库', desc: '管理试卷表格', icon: FileSpreadsheet, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-600' },
    { href: '/mistakes', label: '错题本', desc: '记录与分析', icon: BookOpen, gradient: 'from-orange-500 to-red-500', bg: 'bg-orange-50', text: 'text-orange-600' },
    { href: '/camera', label: '拍照识别', desc: '智能OCR', icon: Camera, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { href: '/ai-solve', label: 'AI解题', desc: '智能分析', icon: Sparkles, gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 p-6 text-white shadow-[0_8px_40px_rgba(99,102,241,0.3)]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        <p className="text-sm text-white/70 font-medium">{greeting}</p>
        <h1 className="text-2xl font-extrabold mt-1 tracking-tight">{profile?.nickname || '教师'}</h1>

        <div className="flex gap-3 mt-5">
          {[
            { v: stats.sheets, l: '表格' },
            { v: stats.mistakes, l: '错题' },
            { v: stats.mastered, l: '已掌握' },
          ].map(s => (
            <div key={s.l} className="flex-1 bg-white/15 backdrop-blur-sm rounded-2xl py-3 text-center">
              <p className="text-2xl font-extrabold">{s.v}</p>
              <p className="text-xs text-white/70 mt-0.5 font-medium">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">快捷功能</h2>
        <div className="grid grid-cols-2 gap-3">
          {actions.map(a => {
            const Icon = a.icon
            return (
              <Link key={a.href} href={a.href}
                className="card card-press p-4 flex items-center gap-3.5 group">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${a.gradient} shadow-[0_4px_12px_rgba(0,0,0,0.1)]`}>
                  <Icon className="w-[19px] h-[19px] text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[15px] text-gray-800">{a.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">{a.desc}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Review */}
      <Link href="/mistakes/review"
        className="card card-press p-4 flex items-center gap-4 group">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(244,63,94,0.3)]">
          <TrendingUp className="w-[20px] h-[20px] text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-base text-gray-800">错题复习</p>
          <p className="text-xs text-gray-400 mt-0.5 font-medium">卡片式复习未掌握的错题</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
      </Link>

      {profile?.role === 'admin' && (
        <Link href="/admin/dashboard"
          className="block w-full py-3.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl text-center text-sm text-indigo-600 font-semibold card-press border border-indigo-100">
          进入管理后台
        </Link>
      )}
    </div>
  )
}
