'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Search, Plus, X, Upload, Trash2, CheckCircle2, Circle, ChevronRight, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface Mistake {
  id: string
  user_id: string
  image_url: string
  subject: string
  knowledge_points: string[]
  wrong_reason: string
  correct_answer: string
  note: string
  keywords: string
  source: string
  analysis: string
  steps: string[]
  answer: string
  content: string
  status: string
  mastered: boolean
  review_count: number
  created_at: string
}

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '其他']

interface SimilarQuestion {
  question: string
  answer: string
  hint: string
}

export default function MistakesPage() {
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<'all' | 'active' | 'mastered'>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [showDetail, setShowDetail] = useState<Mistake | null>(null)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([])

  const [form, setForm] = useState({
    subject: '', knowledgePoints: '', wrongReason: '', correctAnswer: '', note: '', keywords: '',
  })
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')

  const loadMistakes = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const params = new URLSearchParams({ userId: user.id, page: String(page), limit: '20' })
    if (search) params.set('search', search)
    if (filter === 'mastered') params.set('mastered', 'true')
    if (filter === 'active') params.set('mastered', 'false')

    const res = await fetch(`/api/mistakes?${params}`)
    if (res.ok) {
      const { data, count } = await res.json()
      setMistakes(data || [])
      setTotal(count || 0)
    }
    setLoading(false)
  }, [search, page, filter])

  useEffect(() => { loadMistakes() }, [loadMistakes])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setImage(f)
      const reader = new FileReader()
      reader.onload = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(f)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData()
      if (image) formData.append('image', image)
      formData.append('userId', userId)
      formData.append('subject', form.subject || '其他')
      formData.append('knowledgePoints', form.knowledgePoints)
      formData.append('wrongReason', form.wrongReason)
      formData.append('correctAnswer', form.correctAnswer)
      formData.append('note', form.note)
      formData.append('keywords', form.keywords)

      const res = await fetch('/api/mistakes', { method: 'POST', body: formData })
      if (res.ok) {
        toast.success('添加成功')
        setShowAdd(false)
        setForm({ subject: '', knowledgePoints: '', wrongReason: '', correctAnswer: '', note: '', keywords: '' })
        setImage(null)
        setImagePreview('')
        loadMistakes()
      } else {
        const { error } = await res.json()
        toast.error(error || '添加失败')
      }
    } catch { toast.error('添加失败') }
    finally { setSaving(false) }
  }

  async function toggleMastered(m: Mistake) {
    const res = await fetch(`/api/mistakes/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mastered: !m.mastered,
        review_count: (m.review_count || 0) + 1,
        last_reviewed_at: new Date().toISOString(),
      }),
    })
    if (res.ok) {
      toast.success(m.mastered ? '已标记为未掌握' : '已标记为已掌握')
      loadMistakes()
    } else {
      toast.error('操作失败')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除这条错题？')) return
    const res = await fetch(`/api/mistakes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('已删除')
      setShowDetail(null)
      loadMistakes()
    } else {
      toast.error('删除失败')
    }
  }

  async function generateSimilar(mistake: Mistake) {
    setGenerating(true)
    setSimilarQuestions([])
    try {
      const res = await fetch('/api/ai/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: mistake.subject,
          knowledgePoints: mistake.knowledge_points || [],
          answer: mistake.answer || mistake.correct_answer || '',
          count: 3,
        }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setSimilarQuestions(data.questions)
        toast.success(`已生成 ${data.questions.length} 道同类题`)
      } else {
        toast.error('生成同类题失败')
      }
    } catch { toast.error('生成同类题失败') }
    finally { setGenerating(false) }
  }

  async function generateMoreSimilar(mistake: Mistake) {
    setGenerating(true)
    try {
      const existingTexts = similarQuestions.map(q => q.question)
      const res = await fetch('/api/ai/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: mistake.subject,
          knowledgePoints: mistake.knowledge_points || [],
          answer: mistake.answer || mistake.correct_answer || '',
          existingQuestions: existingTexts,
          count: 3,
        }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setSimilarQuestions(prev => [...prev, ...data.questions])
        toast.success(`已生成 ${data.questions.length} 道同类题`)
      } else {
        toast.error('生成同类题失败')
      }
    } catch { toast.error('生成同类题失败') }
    finally { setGenerating(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">错题本</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-orange-600 text-white px-4 h-[38px] rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-transform shadow-lg shadow-orange-200/50">
          <Plus className="w-[18px] h-[18px]" /> 添加错题
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-[18px] h-[18px] text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="搜索错题..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full h-[44px] pl-10 pr-4 bg-white border-0 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-orange-500 transition shadow-sm" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'active', 'mastered'] as const).map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1) }}
            className={`px-4 h-[36px] rounded-xl text-[13px] font-semibold active:scale-[0.98] transition-transform ${
              filter === f ? 'bg-orange-100 text-orange-700' : 'bg-white text-gray-500 shadow-sm'
            }`}>
            {f === 'all' ? '全部' : f === 'active' ? '未掌握' : '已掌握'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-[3px] border-orange-600 border-t-transparent rounded-full" /></div>
      ) : mistakes.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <BookOpen className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-[15px]">{search ? '没有找到匹配的错题' : '还没有错题记录'}</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 text-orange-600 text-[14px] font-semibold active:scale-[0.98] transition-transform">添加第一条错题</button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {mistakes.map(m => (
            <div key={m.id} className={`bg-white rounded-2xl px-4 py-3.5 shadow-sm transition-transform cursor-pointer ${m.mastered ? 'opacity-50' : 'active:scale-[0.98]'}`}
              onClick={() => setShowDetail(m)}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <button onClick={e => { e.stopPropagation(); toggleMastered(m) }} className="mt-0.5 flex-shrink-0 w-[28px] h-[28px] flex items-center justify-center">
                    {m.mastered ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-300" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-md font-medium">{m.subject}</span>
                      {m.source && <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md font-medium">{m.source === 'manual' ? '手动' : m.source === 'ai_solve' ? 'AI解题' : 'OCR'}</span>}
                    </div>
                    {m.wrong_reason && <p className="text-[14px] text-gray-700 mt-1.5 line-clamp-2">{m.wrong_reason}</p>}
                    {m.keywords && <p className="text-[12px] text-gray-400 mt-1 truncate">{m.keywords}</p>}
                    <p className="text-[12px] text-gray-400 mt-1">{new Date(m.created_at).toLocaleDateString('zh-CN')} · 复习 {m.review_count || 0} 次</p>
                  </div>
                </div>
                <ChevronRight className="w-[18px] h-[18px] text-gray-300 flex-shrink-0 ml-2 mt-1" />
              </div>
            </div>
          ))}
          {total > 20 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="w-[40px] h-[40px] flex items-center justify-center bg-white rounded-xl shadow-sm disabled:opacity-30 active:scale-[0.98] transition-transform">
                <ChevronRight className="w-[18px] h-[18px] text-gray-600 rotate-180" />
              </button>
              <span className="text-[13px] text-gray-500 font-medium">{page} / {Math.ceil(total / 20)}</span>
              <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="w-[40px] h-[40px] flex items-center justify-center bg-white rounded-xl shadow-sm disabled:opacity-30 active:scale-[0.98] transition-transform">
                <ChevronRight className="w-[18px] h-[18px] text-gray-600" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Bottom Sheet */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/40 modal-backdrop" />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 sticky top-0 bg-white z-10">
              <h2 className="text-[17px] font-bold text-gray-800">添加错题</h2>
              <button onClick={() => setShowAdd(false)} className="w-[36px] h-[36px] flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">题目图片</label>
                <label className={`flex items-center justify-center border-2 border-dashed rounded-xl transition min-h-[120px] ${imagePreview ? 'border-orange-400 p-1' : 'border-gray-200 p-6 active:border-orange-400'}`}>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="max-h-48 w-full object-contain rounded-lg" />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                      <span className="text-[14px] text-gray-400">点击上传题目图片</span>
                    </div>
                  )}
                </label>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">科目</label>
                <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="w-full h-[48px] px-4 bg-gray-50 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition">
                  <option value="">选择科目</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">错因</label>
                <textarea value={form.wrongReason} onChange={e => setForm(f => ({ ...f, wrongReason: e.target.value }))} rows={2} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition resize-none" placeholder="描述错误原因" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">正确答案</label>
                <input type="text" value={form.correctAnswer} onChange={e => setForm(f => ({ ...f, correctAnswer: e.target.value }))} className="w-full h-[48px] px-4 bg-gray-50 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">知识点（逗号分隔）</label>
                <input type="text" value={form.knowledgePoints} onChange={e => setForm(f => ({ ...f, knowledgePoints: e.target.value }))} className="w-full h-[48px] px-4 bg-gray-50 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition" placeholder="如：三角函数,二次函数" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">笔记</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition resize-none" placeholder="学习笔记" />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">关键词（逗号分隔）</label>
                <input type="text" value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} className="w-full h-[48px] px-4 bg-gray-50 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition" placeholder="用于搜索" />
              </div>
              <button type="submit" disabled={saving} className="w-full h-[50px] bg-orange-600 text-white rounded-xl text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-40 shadow-lg shadow-orange-200/50">
                {saving ? '保存中...' : '添加错题'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Bottom Sheet */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => { setShowDetail(null); setSimilarQuestions([]) }}>
          <div className="absolute inset-0 bg-black/40 modal-backdrop" />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 sticky top-0 bg-white z-10">
              <h2 className="text-[17px] font-bold text-gray-800">错题详情</h2>
              <button onClick={() => { setShowDetail(null); setSimilarQuestions([]) }} className="w-[36px] h-[36px] flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {showDetail.image_url && (
                <img src={showDetail.image_url} alt="题目" className="w-full rounded-xl max-h-64 object-contain bg-gray-50" />
              )}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[11px] bg-orange-50 text-orange-600 px-2 py-1 rounded-md font-medium">{showDetail.subject}</span>
                {showDetail.knowledge_points?.map(p => <span key={p} className="text-[11px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-medium">{p}</span>)}
              </div>
              {showDetail.wrong_reason && (
                <div>
                  <h3 className="text-[13px] font-semibold text-gray-700 mb-1.5">错因</h3>
                  <p className="text-[14px] text-gray-600 bg-gray-50 rounded-xl p-3">{showDetail.wrong_reason}</p>
                </div>
              )}
              {showDetail.correct_answer && (
                <div>
                  <h3 className="text-[13px] font-semibold text-gray-700 mb-1.5">正确答案</h3>
                  <p className="text-[14px] text-green-700 bg-green-50 rounded-xl p-3">{showDetail.correct_answer}</p>
                </div>
              )}
              {showDetail.analysis && (
                <div>
                  <h3 className="text-[13px] font-semibold text-gray-700 mb-1.5">AI分析</h3>
                  <p className="text-[14px] text-gray-600 bg-purple-50 rounded-xl p-3">{showDetail.analysis}</p>
                </div>
              )}
              {showDetail.steps?.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-semibold text-gray-700 mb-1.5">解题步骤</h3>
                  <ol className="list-decimal list-inside text-[14px] text-gray-600 bg-gray-50 rounded-xl p-3 space-y-1">
                    {showDetail.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </div>
              )}
              {showDetail.answer && (
                <div>
                  <h3 className="text-[13px] font-semibold text-gray-700 mb-1.5">答案</h3>
                  <p className="text-[14px] text-blue-700 bg-blue-50 rounded-xl p-3">{showDetail.answer}</p>
                </div>
              )}
              {showDetail.note && (
                <div>
                  <h3 className="text-[13px] font-semibold text-gray-700 mb-1.5">笔记</h3>
                  <p className="text-[14px] text-gray-600 bg-yellow-50 rounded-xl p-3">{showDetail.note}</p>
                </div>
              )}

              {/* Similar questions */}
              {similarQuestions.length === 0 && (
                <button onClick={() => generateSimilar(showDetail)} disabled={generating}
                  className="w-full h-[44px] bg-purple-50 text-purple-600 rounded-2xl text-[14px] font-semibold active:scale-[0.98] disabled:opacity-50 transition-transform">
                  {generating ? '生成中...' : '推荐相似题型'}
                </button>
              )}

              {similarQuestions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[14px] font-bold text-gray-800 flex items-center gap-2">
                    <BookOpen className="w-[16px] h-[16px] text-purple-500" /> 相似题型推荐 ({similarQuestions.length}道)
                  </h3>
                  {similarQuestions.map((q, i) => (
                    <div key={i} className="bg-purple-50/50 rounded-2xl p-4">
                      <p className="text-[12px] font-semibold text-purple-600">题目 {i + 1}</p>
                      <p className="text-[14px] text-gray-700 mt-1.5">{q.question}</p>
                      <details className="mt-3">
                        <summary className="text-[13px] text-purple-600 font-medium cursor-pointer">查看答案</summary>
                        <p className="text-[14px] text-green-700 mt-2 font-medium">{q.answer}</p>
                        <p className="text-[12px] text-gray-400 mt-1">提示：{q.hint}</p>
                      </details>
                    </div>
                  ))}
                  <button onClick={() => generateMoreSimilar(showDetail)} disabled={generating}
                    className="w-full h-[44px] bg-purple-100 text-purple-700 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 transition-transform">
                    <RefreshCw className={`w-[14px] h-[14px] ${generating ? 'animate-spin' : ''}`} />
                    {generating ? '生成中...' : '继续生成更多相似题'}
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => toggleMastered(showDetail)}
                  className={`flex-1 h-[48px] rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-transform ${
                    showDetail.mastered ? 'bg-green-100 text-green-700' : 'bg-green-600 text-white shadow-lg shadow-green-200/50'
                  }`}>
                  {showDetail.mastered ? '已掌握' : '标记为已掌握'}
                </button>
                <button onClick={() => handleDelete(showDetail.id)} className="w-[48px] h-[48px] flex items-center justify-center bg-red-50 text-red-600 rounded-xl active:bg-red-100 transition-colors">
                  <Trash2 className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
