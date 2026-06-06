'use client'

import { useEffect, useState, useRef, useTransition } from 'react'
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

function getCached(): boolean {
  if (typeof window === 'undefined') return false
  return !!sessionStorage.getItem('user_auth')
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(() => !getCached())
  const checkedRef = useRef(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    tabs.forEach(t => router.prefetch(t.href))
  }, [router])

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true
    if (getCached()) { setLoading(false); return }

    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const res = await fetch(`/api/user/profile?userId=${user.id}`)
      if (res.ok) {
        const { data: profile } = await res.json()
        if (profile) {
          if (profile.role === 'admin' || profile.role === 'super_admin') {
            router.replace('/admin/dashboard'); return
          }
          try { sessionStorage.setItem('user_profile', JSON.stringify(profile)) } catch { /* */ }
          sessionStorage.setItem('user_auth', '1')
        }
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-gray-100">
        <div className="w-8 h-8 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-gray-100">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="mx-auto w-full max-w-lg px-4 pt-6 pb-28">
          {children}
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg">
        <nav className="bg-white/90 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-gray-100/60 px-2 py-1.5" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex items-stretch h-14">
            {tabs.map(tab => {
              const Icon = tab.icon
              const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  prefetch
                  onClick={(e) => {
                    if (active) { e.preventDefault(); return }
                    startTransition(() => {})
                  }}
                  className={`relative flex flex-col items-center justify-center min-w-0 flex-1 rounded-2xl select-none active:opacity-60 ${
                    active ? 'text-indigo-600 bg-indigo-50/80' : 'text-gray-400'
                  }`}
                  style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
                >
                  <Icon className="w-[22px] h-[22px] mb-0.5" strokeWidth={active ? 2.5 : 1.75} />
                  <span className="text-[10px] leading-none font-semibold">{tab.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
