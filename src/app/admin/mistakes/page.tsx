'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, CheckCircle2, Circle, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCached, setCache } from '@/lib/cache'

interface Mistake {
  id: string; user_id: string; subject: string; knowledge_point: string
  wrong_reason: string; correct_answer: string; notes: string; analysis: string
  solution_steps: string; image_url: string; keywords: string
  mastered: boolean; review_count: number; created_at: string
  profiles: { nickname: string } | null
}

export default function AdminMistakesPage() {
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    const cacheKey = `admin_mistakes:${search}:${page}`
    const cached = getCached<{ mistakes: Mistake[]; total: number }>(cacheKey)
    if (cached) { setMistakes(cached.mistakes); setTotal(cached.total); setLoading(false); return }
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/mistakes?${params}`)
    if (res.ok) {
      const { data, count } = await res.json()
      const list = data || []
      setMistakes(list); setTotal(count || 0)
      setCache(cacheKey, { mistakes: list, total: count || 0 })
    }
    setLoading(false)
  }, [search, page])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    if (!confirm('确定删除这个错题？此操作不可恢复。')) return
    setDeleting(id)
    const res = await fetch(`/api/admin/mistakes?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('已删除')
      try { Object.keys(sessionStorage).filter(k => k.startsWith('cache:admin_mistakes:')).forEach(k => sessionStorage.removeItem(k)) } catch { /* */ }
      load()
    } else {
      const { error } = await res.json().catch(() => ({ error: '删除失败' }))
      toast.error(error || '删除失败')
    }
    setDeleting(null)
  }

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
            <div key={m.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${m.mastered ? 'opacity-60' : ''}`}>
              <div className="px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <div onClick={() => setExpanded(expanded === m.id ? null : m.id)} className="flex-1 min-w-0 cursor-pointer">
                    <div className="flex items-center gap-2">
                      {m.mastered ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" /> : <Circle className="w-5 h-5 text-gray-300 flex-shrink-0" />}
                      <span className="text-[11px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md font-medium">{m.subject}</span>
                      {m.knowledge_point && <span className="text-[11px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-md font-medium truncate">{m.knowledge_point}</span>}
                      {expanded === m.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                    {m.wrong_reason && <p className="text-[14px] text-gray-700 mt-1.5 line-clamp-2">{m.wrong_reason}</p>}
                    {m.image_url && !expanded && (
                      <img src={m.image_url} alt="" className="mt-2 w-full max-h-24 object-contain rounded-xl bg-gray-50" />
                    )}
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      {m.profiles?.nickname || m.user_id.slice(0, 8)} · {new Date(m.created_at).toLocaleDateString('zh-CN')} · 复习{m.review_count || 0}次
                    </p>
                  </div>
                  <button onClick={() => handleDelete(m.id)} disabled={deleting === m.id}
                    className="w-8 h-8 flex items-center justify-center text-red-400 active:bg-red-50 rounded-lg flex-shrink-0 disabled:opacity-50">
                    <Trash2 className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
              {expanded === m.id && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                  {m.image_url && (
                    <img src={m.image_url} alt="" className="mt-3 w-full max-h-64 object-contain rounded-xl bg-gray-50" />
                  )}
                  <div className="space-y-3 mt-3">
                    {m.wrong_reason && (
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">错误原因</span>
                        <p className="text-[14px] text-gray-800 mt-0.5 leading-relaxed">{m.wrong_reason}</p>
                      </div>
                    )}
                    {m.correct_answer && (
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">正确答案</span>
                        <p className="text-[14px] text-gray-800 mt-0.5 leading-relaxed bg-green-50 rounded-xl p-3">{m.correct_answer}</p>
                      </div>
                    )}
                    {m.analysis && (
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">分析</span>
                        <p className="text-[14px] text-gray-800 mt-0.5 leading-relaxed">{m.analysis}</p>
                      </div>
                    )}
                    {m.solution_steps && (
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">解题步骤</span>
                        <p className="text-[13px] text-gray-800 mt-0.5 leading-relaxed whitespace-pre-wrap">{m.solution_steps}</p>
                      </div>
                    )}
                    {m.notes && (
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">笔记</span>
                        <p className="text-[14px] text-gray-800 mt-0.5 leading-relaxed">{m.notes}</p>
                      </div>
                    )}
                    {m.keywords && (
                      <div className="flex flex-wrap gap-1">
                        {m.keywords.split(',').filter(Boolean).map((kw: string) => (
                          <span key={kw} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">{kw.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>
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
