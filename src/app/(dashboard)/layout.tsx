'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Home, FileSpreadsheet, BookOpen, Camera, User } from 'lucide-react'

const tabs = [
  { href: '/home', label: '首页', icon: Home },
  { href: '/sheets', label: '表格', icon: FileSpreadsheet },
  { href: '/mistakes', label: '错题', icon: BookOpen },
  { href: '/camera', label: '拍照', icon: Camera },
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
        if (profile) {
          if (profile.status === 'pending' || profile.status === 'rejected' || profile.status === 'frozen') {
            router.push('/pending'); return
          }
          if (profile.role === 'admin' || profile.role === 'super_admin') {
            router.push('/admin/dashboard'); return
          }
        }
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-full flex flex-col bg-[#f5f5f7]">
      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="mx-auto w-full px-4 pt-4 pb-6">
          {children}
        </div>
      </div>

      {/* Bottom Tab Bar - Mobile style */}
      <nav className="flex-shrink-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 bottom-nav">
        <div className="flex items-center justify-around h-[52px]">
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex flex-col items-center justify-center min-w-0 flex-1 h-full touch-pressed ${
                  active ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-blue-600 rounded-full" />
                )}
                <Icon className="w-[22px] h-[22px] mb-0.5" strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] leading-none font-medium">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
