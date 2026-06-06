'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, FileText, Trash2, ChevronDown, ChevronUp, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCached, setCache } from '@/lib/cache'

interface Sheet {
  id: string; user_id: string; title: string; subject: string; grade: string
  exam_type: string; exam_date: string; file_type: string; file_size: number
  file_url: string; download_count: number; created_at: string
  profiles: { nickname: string } | null
}

export default function AdminSheetsPage() {
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    const cacheKey = `admin_sheets:${search}:${page}`
    const cached = getCached<{ sheets: Sheet[]; total: number }>(cacheKey)
    if (cached) { setSheets(cached.sheets); setTotal(cached.total); setLoading(false); return }
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/sheets?${params}`)
    if (res.ok) {
      const { data, count } = await res.json()
      const list = data || []
      setSheets(list); setTotal(count || 0)
      setCache(cacheKey, { sheets: list, total: count || 0 })
    }
    setLoading(false)
  }, [search, page])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    if (!confirm('确定删除这个表格？此操作不可恢复。')) return
    setDeleting(id)
    const res = await fetch(`/api/admin/sheets?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('已删除')
      try { Object.keys(sessionStorage).filter(k => k.startsWith('cache:admin_sheets:')).forEach(k => sessionStorage.removeItem(k)) } catch { /* */ }
      load()
    } else {
      const { error } = await res.json().catch(() => ({ error: '删除失败' }))
      toast.error(error || '删除失败')
    }
    setDeleting(null)
  }

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
            <div key={s.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3.5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-[16px] h-[16px] text-blue-500 flex-shrink-0" />
                      <span className="text-[15px] font-semibold text-gray-800 truncate">{s.title}</span>
                      {expanded === s.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {s.subject && <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">{s.subject}</span>}
                      {s.grade && <span className="text-[11px] bg-green-50 text-green-600 px-2 py-0.5 rounded-md">{s.grade}</span>}
                      {s.exam_type && <span className="text-[11px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-md">{s.exam_type}</span>}
                      <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">{s.file_type}</span>
                      <span className="text-[11px] text-gray-400">{formatSize(s.file_size)}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      {s.profiles?.nickname || s.user_id.slice(0, 8)} · {new Date(s.created_at).toLocaleDateString('zh-CN')} · 下载{s.download_count || 0}次
                    </p>
                  </div>
                  <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id}
                    className="w-8 h-8 flex items-center justify-center text-red-400 active:bg-red-50 rounded-lg flex-shrink-0 ml-2 disabled:opacity-50">
                    <Trash2 className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
              {expanded === s.id && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {s.subject && <div><span className="text-[10px] text-gray-400">学科</span><p className="text-[13px] text-gray-700 font-medium">{s.subject}</p></div>}
                    {s.grade && <div><span className="text-[10px] text-gray-400">年级</span><p className="text-[13px] text-gray-700 font-medium">{s.grade}</p></div>}
                    {s.exam_type && <div><span className="text-[10px] text-gray-400">类型</span><p className="text-[13px] text-gray-700 font-medium">{s.exam_type}</p></div>}
                    {s.exam_date && <div><span className="text-[10px] text-gray-400">日期</span><p className="text-[13px] text-gray-700 font-medium">{s.exam_date}</p></div>}
                    <div><span className="text-[10px] text-gray-400">大小</span><p className="text-[13px] text-gray-700 font-medium">{formatSize(s.file_size)}</p></div>
                    <div><span className="text-[10px] text-gray-400">格式</span><p className="text-[13px] text-gray-700 font-medium">{s.file_type}</p></div>
                  </div>
                  {s.file_url && (
                    <a href={s.file_url} target="_blank" rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-[13px] font-semibold active:bg-blue-700 transition-colors">
                      <Download className="w-[14px] h-[14px]" />下载文件
                    </a>
                  )}
                </div>
              )}
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
