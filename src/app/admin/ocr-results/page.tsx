'use client'

import { useEffect, useState } from 'react'
import { ScanLine, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCached, setCache } from '@/lib/cache'

interface OcrRecord {
  id: string
  user_id: string
  original_image: string
  recognized_data: string[][]
  excel_file: string
  status: string
  row_count: number
  col_count: number
  created_at: string
  profiles?: { nickname: string }
}

export default function AdminOcrResultsPage() {
  const [records, setRecords] = useState<OcrRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  function load() {
    const cacheKey = `admin_ocr:${page}`
    const cached = getCached<{ records: OcrRecord[]; total: number }>(cacheKey)
    if (cached) {
      setRecords(cached.records)
      setTotal(cached.total)
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`/api/admin/ocr-results?page=${page}&limit=20`)
      .then(r => r.json())
      .then(({ data, total: t }) => {
        const list = data || []
        setRecords(list)
        setTotal(t || 0)
        setCache(cacheKey, { records: list, total: t || 0 })
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id: string) {
    if (!confirm('确定删除这条OCR记录？')) return
    const res = await fetch(`/api/admin/ocr-results?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('已删除')
      try { Object.keys(sessionStorage).filter(k => k.startsWith('cache:admin_ocr:')).forEach(k => sessionStorage.removeItem(k)) } catch { /* */ }
      load()
    } else {
      const { error } = await res.json().catch(() => ({ error: '删除失败' }))
      toast.error(error || '删除失败')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">OCR 识别记录</h1>

      {records.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <ScanLine className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">暂无OCR记录</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {records.map(r => (
            <div key={r.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">
                      {r.row_count}行 × {r.col_count}列
                    </span>
                    <span className={`tag text-[11px] ${r.status === 'pending_review' ? 'bg-amber-50 text-amber-600' : r.status === 'saved' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                      {r.status === 'pending_review' ? '待审核' : r.status === 'saved' ? '已保存' : r.status === 'exported' ? '已导出' : r.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 font-medium">
                    {r.profiles?.nickname || '未知用户'} · {new Date(r.created_at).toLocaleDateString('zh-CN')}
                  </p>
                  {r.original_image && (
                    <img src={r.original_image} alt="OCR" className="mt-2 w-full max-h-32 object-contain rounded-xl bg-gray-50" />
                  )}
                </div>
                <button onClick={() => handleDelete(r.id)}
                  className="w-8 h-8 flex items-center justify-center text-red-400 active:bg-red-50 rounded-lg ml-2 flex-shrink-0">
                  <Trash2 className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm disabled:opacity-30 active:scale-[0.98] transition-transform">
            <ChevronLeft className="w-[18px] h-[18px] text-gray-600" />
          </button>
          <span className="text-sm text-gray-500 font-medium">{page} / {Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}
            className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm disabled:opacity-30 active:scale-[0.98] transition-transform">
            <ChevronRight className="w-[18px] h-[18px] text-gray-600" />
          </button>
        </div>
      )}
    </div>
  )
}
