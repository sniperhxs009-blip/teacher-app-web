'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, CheckCircle2, Circle } from 'lucide-react'

interface Mistake { id: string; user_id: string; subject: string; wrong_reason: string; mastered: boolean; review_count: number; created_at: string; profiles: { nickname: string } }

export default function AdminMistakesPage() {
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) params.set('search', search)

    const res = await fetch(`/api/admin/mistakes?${params}`)
    if (res.ok) {
      const { data, count } = await res.json()
      setMistakes(data || [])
      setTotal(count || 0)
    }
    setLoading(false)
  }, [search, page])

  useEffect(() => { setLoading(true); load() }, [load])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">错题管理</h1>
      <div className="relative">
        <Search className="w-[18px] h-[18px] text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="搜索错题..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full h-[44px] pl-10 pr-4 bg-white border-0 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-orange-500 transition shadow-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-[3px] border-orange-600 border-t-transparent rounded-full" /></div>
      ) : mistakes.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm"><p className="text-gray-400 text-[15px]">暂无错题</p></div>
      ) : (
        <div className="space-y-2.5">
          {mistakes.map(m => (
            <div key={m.id} className={`bg-white rounded-2xl px-4 py-3.5 shadow-sm ${m.mastered ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-3">
                {m.mastered ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" /> : <Circle className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md">{m.subject}</span>
                  </div>
                  {m.wrong_reason && <p className="text-[14px] text-gray-700 mt-1.5 line-clamp-2">{m.wrong_reason}</p>}
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    {m.profiles?.nickname || m.user_id.slice(0, 8)} · {new Date(m.created_at).toLocaleDateString('zh-CN')} · 复习{m.review_count || 0}次
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
