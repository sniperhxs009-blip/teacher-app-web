'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb } from 'lucide-react'
import toast from 'react-hot-toast'

interface ReviewMistake {
  id: string
  image_url: string
  subject: string
  knowledge_points: string[]
  wrong_reason: string
  correct_answer: string
  analysis: string
  steps: string[]
  answer: string
  note: string
  review_count: number
}

export default function ReviewPage() {
  const router = useRouter()
  const [mistakes, setMistakes] = useState<ReviewMistake[]>([])
  const [current, setCurrent] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const params = new URLSearchParams({ userId: user.id, mastered: 'false', limit: '20' })
      const res = await fetch(`/api/mistakes?${params}`)
      if (res.ok) {
        const { data } = await res.json()
        setMistakes((data as ReviewMistake[]) || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleResult(mastered: boolean) {
    const mistake = mistakes[current]
    if (!mistake) return

    const res = await fetch(`/api/mistakes/${mistake.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mastered,
        review_count: (mistake.review_count || 0) + 1,
        last_reviewed_at: new Date().toISOString(),
      }),
    })

    if (res.ok) {
      if (current + 1 < mistakes.length) {
        setCurrent(c => c + 1)
        setShowAnswer(false)
      } else {
        setDone(true)
      }
      if (mastered) toast.success('已标记为掌握')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-[3px] border-orange-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-[0_8px_32px_rgba(52,211,153,0.3)]">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-800">复习完成</h1>
        <p className="text-gray-400 mt-2 text-[15px] font-medium">本次复习已完成，继续保持！</p>
        <button onClick={() => { setCurrent(0); setDone(false); setShowAnswer(false) }}
          className="mt-6 px-8 h-[52px] bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-2xl text-[15px] font-bold active:scale-[0.98] transition-all duration-200 shadow-[0_4px_20px_rgba(251,146,60,0.3)]">
          重新复习
        </button>
      </div>
    )
  }

  if (mistakes.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-10 h-10 text-gray-400" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-800">没有待复习的错题</h1>
        <p className="text-gray-400 mt-2 text-[15px] font-medium">所有错题都已掌握！</p>
        <button onClick={() => router.back()} className="mt-6 px-6 h-[44px] text-indigo-600 text-sm font-bold active:scale-[0.98] transition-transform">返回错题本</button>
      </div>
    )
  }

  const m = mistakes[current]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm text-indigo-600 font-bold active:scale-[0.98] transition-transform">← 返回</button>
        <h1 className="text-lg font-extrabold text-gray-800">错题复习</h1>
        <span className="text-sm text-gray-400 font-bold">{current + 1} / {mistakes.length}</span>
      </div>

      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-500" style={{ width: `${((current + 1) / mistakes.length) * 100}%` }} />
      </div>

      <div className="card overflow-hidden">
        {m.image_url && (
          <img src={m.image_url} alt="题目" className="w-full max-h-72 object-contain bg-gray-50" />
        )}

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <span className="tag bg-orange-50 text-orange-600">{m.subject}</span>
            {m.knowledge_points?.map(p => (
              <span key={p} className="tag bg-blue-50 text-blue-600">{p}</span>
            ))}
          </div>

          {m.wrong_reason && (
            <div>
              <h3 className="text-sm font-extrabold text-gray-700 mb-2">错因</h3>
              <p className="text-sm text-gray-600 bg-red-50 rounded-2xl p-4 leading-relaxed">{m.wrong_reason}</p>
            </div>
          )}

          {m.note && (
            <div>
              <h3 className="text-sm font-extrabold text-gray-700 mb-2">笔记</h3>
              <p className="text-sm text-gray-600 bg-amber-50 rounded-2xl p-4 leading-relaxed">{m.note}</p>
            </div>
          )}

          {!showAnswer ? (
            <button onClick={() => setShowAnswer(true)}
              className="w-full h-[48px] bg-indigo-50 text-indigo-600 rounded-2xl text-sm font-bold active:scale-[0.98] transition-all duration-200 hover:bg-indigo-100">
              查看答案与解析
            </button>
          ) : (
            <div className="space-y-4 pt-1">
              {m.analysis && (
                <div>
                  <h3 className="text-sm font-extrabold text-gray-700 mb-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-xl bg-amber-100 flex items-center justify-center">
                      <Lightbulb className="w-[14px] h-[14px] text-amber-500" />
                    </div>
                    分析
                  </h3>
                  <p className="text-sm text-gray-600 bg-violet-50 rounded-2xl p-4 leading-relaxed">{m.analysis}</p>
                </div>
              )}
              {m.steps?.length > 0 && (
                <div>
                  <h3 className="text-sm font-extrabold text-gray-700 mb-2">解题步骤</h3>
                  <ol className="space-y-2">
                    {m.steps.map((s, i) => (
                      <li key={i} className="flex gap-3 text-sm text-gray-600">
                        <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                        <span className="pt-0.5">{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div>
                <h3 className="text-sm font-extrabold text-gray-700 mb-2">答案</h3>
                <p className="text-lg font-extrabold text-emerald-700 bg-emerald-50 rounded-2xl p-4">{m.answer || m.correct_answer}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => handleResult(false)}
          className="flex-1 h-[52px] bg-red-50 text-red-600 rounded-2xl text-[15px] font-bold active:scale-[0.98] transition-all duration-200 hover:bg-red-100 flex items-center justify-center gap-2">
          <ArrowLeft className="w-[18px] h-[18px]" /> 仍需努力
        </button>
        <button onClick={() => handleResult(true)}
          className="flex-1 h-[52px] bg-gradient-to-r from-emerald-400 to-green-500 text-white rounded-2xl text-[15px] font-bold active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(52,211,153,0.3)]">
          <CheckCircle2 className="w-[18px] h-[18px]" /> 我已掌握
        </button>
      </div>

      <button onClick={() => { if (current < mistakes.length - 1) { setCurrent(c => c + 1); setShowAnswer(false) } }} disabled={current >= mistakes.length - 1}
        className="w-full h-[44px] text-sm text-gray-400 font-medium flex items-center justify-center gap-1 disabled:opacity-30 active:scale-[0.98] transition-transform">
        跳过 <ArrowRight className="w-[14px] h-[14px]" />
      </button>
    </div>
  )
}
