'use client'

import { useEffect, useState } from 'react'
import { Users, Clock, FileSpreadsheet, BookOpen } from 'lucide-react'

interface Stats { userCount: number; pendingCount: number; sheetCount: number; mistakeCount: number }

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => r.json()).then(setStats)
  }, [])

  if (!stats) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full" /></div>
  }

  const cards = [
    { label: '总用户', value: stats.userCount, icon: Users, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: '待审核', value: stats.pendingCount, icon: Clock, color: 'from-yellow-500 to-orange-600', bg: 'bg-yellow-50', text: 'text-yellow-600' },
    { label: '表格', value: stats.sheetCount, icon: FileSpreadsheet, color: 'from-green-500 to-emerald-600', bg: 'bg-green-50', text: 'text-green-600' },
    { label: '错题', value: stats.mistakeCount, icon: BookOpen, color: 'from-purple-500 to-indigo-600', bg: 'bg-purple-50', text: 'text-purple-600' },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">管理概览</h1>
      <div className="grid grid-cols-2 gap-3">
        {cards.map(c => {
          const Icon = c.icon
          return (
            <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className={`w-[40px] h-[40px] rounded-xl flex items-center justify-center ${c.bg}`}>
                <Icon className={`w-[20px] h-[20px] ${c.text}`} />
              </div>
              <p className="text-[28px] font-bold text-gray-800 mt-3">{c.value}</p>
              <p className="text-[12px] text-gray-400 mt-0.5">{c.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
