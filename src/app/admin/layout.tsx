'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, Users, FileSpreadsheet, BookOpen, ClipboardList, ArrowLeft, ScanLine, Settings } from 'lucide-react'

const adminTabs = [
  { href: '/admin/dashboard', label: '概览', icon: LayoutDashboard },
  { href: '/admin/users', label: '用户', icon: Users },
  { href: '/admin/sheets', label: '表格', icon: FileSpreadsheet },
  { href: '/admin/mistakes', label: '错题', icon: BookOpen },
  { href: '/admin/ocr-results', label: 'OCR', icon: ScanLine },
  { href: '/admin/logs', label: '日志', icon: ClipboardList },
  { href: '/admin/config', label: '设置', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch(`/api/user/profile?userId=${user.id}`)
      if (res.ok) {
        const { data: profile } = await res.json()
        if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
          router.push('/home'); return
        }
        setAuthorized(true)
      }
      setLoading(false)
    }
    check()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-[#f5f5f7]">
        <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!authorized) return null

  return (
    <div className="min-h-full flex flex-col bg-[#f5f5f7]">
      <div className="flex-shrink-0 bg-white shadow-sm">
        <div className="flex items-center h-[48px] px-4 gap-3">
          <Link href="/home" className="w-[36px] h-[36px] flex items-center justify-center text-gray-500 active:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-[16px] font-bold text-gray-800">管理后台</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="mx-auto w-full px-4 pt-4 pb-24">
          {children}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-100">
        <div className="flex items-center justify-around h-[56px] overflow-x-auto no-scrollbar">
          {adminTabs.map(tab => {
            const Icon = tab.icon
            const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex flex-col items-center justify-center min-w-0 flex-shrink-0 px-2 h-full ${
                  active ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-blue-600 rounded-full" />
                )}
                <Icon className="w-[20px] h-[20px] mb-0.5" strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] leading-none font-medium">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
