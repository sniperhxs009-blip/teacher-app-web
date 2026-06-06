'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, FileText } from 'lucide-react'

interface Sheet { id: string; user_id: string; title: string; subject: string; grade: string; exam_type: string; file_type: string; file_size: number; download_count: number; created_at: string; profiles: { nickname: string } }

export default function AdminSheetsPage() {
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) params.set('search', search)

    const res = await fetch(`/api/admin/sheets?${params}`)
    if (res.ok) {
      const { data, count } = await res.json()
      setSheets(data || [])
      setTotal(count || 0)
    }
    setLoading(false)
  }, [search, page])

  useEffect(() => { setLoading(true); load() }, [load])

  function formatSize(bytes: number) { return bytes < 1048576 ? `${(bytes / 1024).toFixed(1)}KB` : `${(bytes / 1048576).toFixed(1)}MB` }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">表格管理</h1>
      <div className="relative">
        <Search className="w-[18px] h-[18px] text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="搜索表格..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full h-[44px] pl-10 pr-4 bg-white border-0 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full" /></div>
      ) : sheets.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm"><p className="text-gray-400 text-[15px]">暂无表格</p></div>
      ) : (
        <div className="space-y-2.5">
          {sheets.map(s => (
            <div key={s.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-[16px] h-[16px] text-blue-500" />
                    <span className="text-[15px] font-semibold text-gray-800 truncate">{s.title}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {s.subject && <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">{s.subject}</span>}
                    {s.grade && <span className="text-[11px] bg-green-50 text-green-600 px-2 py-0.5 rounded-md">{s.grade}</span>}
                    <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">{s.file_type}</span>
                    <span className="text-[11px] text-gray-400">{formatSize(s.file_size)}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    {s.profiles?.nickname || s.user_id.slice(0, 8)} · {new Date(s.created_at).toLocaleDateString('zh-CN')} · 下载{s.download_count || 0}次
                  </p>
                </div>
              </div>
            </div>
          ))}
          {total > 20 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="w-[40px] h-[40px] bg-white rounded-xl shadow-sm disabled:opacity-30 active:scale-[0.98] transition-transform">&lt;</button>
              <span className="text-[13px] text-gray-500">{page} / {Math.ceil(total / 20)}</span>
              <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="w-[40px] h-[40px] bg-white rounded-xl shadow-sm disabled:opacity-30 active:scale-[0.98] transition-transform">&gt;</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
