'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Home, FileSpreadsheet, BookOpen, Camera, User } from 'lucide-react'

const tabs = [
  { href: '/home', label: '首页', icon: Home },
  { href: '/sheets', label: '表格', icon: FileSpreadsheet },
  { href: '/camera', label: '拍照', icon: Camera },
  { href: '/mistakes', label: '错题', icon: BookOpen },
  { href: '/profile', label: '我的', icon: User },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const res = await fetch(`/api/user/profile?userId=${user.id}`)
      if (res.ok) {
        const { data: profile } = await res.json()
        if (profile && (profile.role === 'admin' || profile.role === 'super_admin')) {
          router.push('/admin/dashboard'); return
        }
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-gray-100">
      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="mx-auto w-full max-w-lg px-4 pt-6 pb-28">
          {children}
        </div>
      </div>

      {/* Floating Tab Bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg">
        <nav className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_4px_32px_rgba(0,0,0,0.08)] border border-gray-100/60 px-2 py-1.5">
          <div className="flex items-center justify-around h-14">
            {tabs.map(tab => {
              const Icon = tab.icon
              const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`relative flex flex-col items-center justify-center min-w-0 flex-1 h-full rounded-2xl transition-all duration-200 ${
                    active
                      ? 'text-indigo-600 bg-indigo-50/80'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Icon className="w-[22px] h-[22px] mb-0.5" strokeWidth={active ? 2.5 : 1.75} />
                  <span className="text-[10px] leading-none font-semibold tracking-wide">{tab.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
