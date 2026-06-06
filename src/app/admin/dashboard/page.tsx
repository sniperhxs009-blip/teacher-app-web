'use client'

import { useEffect, useState } from 'react'
import { Users, Clock, FileSpreadsheet, BookOpen, CheckCircle2, ScanLine } from 'lucide-react'

interface Stats {
  userCount: number
  pendingCount: number
  approvedCount: number
  sheetCount: number
  mistakeCount: number
  ocrCount: number
}

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
    { label: '已通过', value: stats.approvedCount, icon: CheckCircle2, color: 'from-emerald-500 to-green-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    { label: '待审核', value: stats.pendingCount, icon: Clock, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-600' },
    { label: '表格', value: stats.sheetCount, icon: FileSpreadsheet, color: 'from-cyan-500 to-teal-600', bg: 'bg-cyan-50', text: 'text-cyan-600' },
    { label: '错题', value: stats.mistakeCount, icon: BookOpen, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600' },
    { label: 'OCR记录', value: stats.ocrCount, icon: ScanLine, color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50', text: 'text-rose-600' },
  ]

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">管理概览</h1>
      <div className="grid grid-cols-2 gap-3">
        {cards.map(c => {
          const Icon = c.icon
          return (
            <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg}`}>
                <Icon className={`w-5 h-5 ${c.text}`} />
              </div>
              <p className="text-[28px] font-bold text-gray-800 mt-3">{c.value}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">{c.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
