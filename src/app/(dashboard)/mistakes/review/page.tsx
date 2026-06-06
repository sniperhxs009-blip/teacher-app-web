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
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-[3px] border-red-600 border-t-transparent rounded-full" /></div>
  }

  if (done) {
    return (
      <div className="text-center py-16">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-[22px] font-bold text-gray-800">复习完成</h1>
        <p className="text-gray-400 mt-2 text-[15px]">本次复习已完成，继续保持！</p>
        <button onClick={() => { setCurrent(0); setDone(false); setShowAnswer(false) }} className="mt-6 px-8 h-[48px] bg-red-600 text-white rounded-xl text-[15px] font-semibold active:scale-[0.98] transition-transform shadow-lg shadow-red-200/50">重新复习</button>
      </div>
    )
  }

  if (mistakes.length === 0) {
    return (
      <div className="text-center py-16">
        <h1 className="text-[22px] font-bold text-gray-800">没有待复习的错题</h1>
        <p className="text-gray-400 mt-2 text-[15px]">所有错题都已掌握！</p>
        <button onClick={() => router.back()} className="mt-6 px-6 h-[44px] text-blue-600 text-[14px] font-semibold active:scale-[0.98] transition-transform">返回错题本</button>
      </div>
    )
  }

  const m = mistakes[current]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="text-[14px] text-blue-600 font-semibold active:scale-[0.98] transition-transform">← 返回</button>
        <h1 className="text-lg font-bold text-gray-800">错题复习</h1>
        <span className="text-[13px] text-gray-400 font-medium">{current + 1} / {mistakes.length}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-red-500 rounded-full transition-all duration-300" style={{ width: `${((current + 1) / mistakes.length) * 100}%` }} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {m.image_url && (
          <img src={m.image_url} alt="题目" className="w-full max-h-72 object-contain bg-gray-50" />
        )}

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[11px] bg-red-50 text-red-600 px-2 py-1 rounded-md font-medium">{m.subject}</span>
            {m.knowledge_points?.map(p => (
              <span key={p} className="text-[11px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-medium">{p}</span>
            ))}
          </div>

          {m.wrong_reason && (
            <div>
              <h3 className="text-[13px] font-semibold text-gray-700 mb-1.5">错因</h3>
              <p className="text-[14px] text-gray-600 bg-red-50 rounded-xl p-3">{m.wrong_reason}</p>
            </div>
          )}

          {m.note && (
            <div>
              <h3 className="text-[13px] font-semibold text-gray-700 mb-1.5">笔记</h3>
              <p className="text-[14px] text-gray-600 bg-yellow-50 rounded-xl p-3">{m.note}</p>
            </div>
          )}

          {!showAnswer ? (
            <button onClick={() => setShowAnswer(true)} className="w-full h-[48px] bg-blue-50 text-blue-600 rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-transform">
              查看答案与解析
            </button>
          ) : (
            <div className="space-y-3 pt-1">
              {m.analysis && (
                <div>
                  <h3 className="text-[13px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5"><Lightbulb className="w-[16px] h-[16px] text-yellow-500" /> 分析</h3>
                  <p className="text-[14px] text-gray-600 bg-purple-50 rounded-xl p-3">{m.analysis}</p>
                </div>
              )}
              {m.steps?.length > 0 && (
                <div>
                  <h3 className="text-[13px] font-semibold text-gray-700 mb-1.5">解题步骤</h3>
                  <ol className="list-decimal list-inside text-[14px] text-gray-600 space-y-1">
                    {m.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </div>
              )}
              <div>
                <h3 className="text-[13px] font-semibold text-gray-700 mb-1.5">答案</h3>
                <p className="text-lg font-bold text-green-700 bg-green-50 rounded-xl p-3">{m.answer || m.correct_answer}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button onClick={() => handleResult(false)} className="flex-1 h-[52px] bg-red-50 text-red-600 rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2">
          <ArrowLeft className="w-[18px] h-[18px]" /> 仍需努力
        </button>
        <button onClick={() => handleResult(true)} className="flex-1 h-[52px] bg-green-600 text-white rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2 shadow-lg shadow-green-200/50">
          <CheckCircle2 className="w-[18px] h-[18px]" /> 我已掌握
        </button>
      </div>

      <button onClick={() => { if (current < mistakes.length - 1) { setCurrent(c => c + 1); setShowAnswer(false) } }} disabled={current >= mistakes.length - 1} className="w-full h-[44px] text-[14px] text-gray-400 flex items-center justify-center gap-1 disabled:opacity-30 active:scale-[0.98] transition-transform">
        跳过 <ArrowRight className="w-[14px] h-[14px]" />
      </button>
    </div>
  )
}
