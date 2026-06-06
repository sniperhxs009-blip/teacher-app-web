'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Lightbulb, ListChecks, CheckCircle, BookOpen, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface SolveResult {
  id: string
  image_url: string
  subject: string
  knowledge_points: string[]
  analysis: string
  steps: string[]
  answer: string
}

interface SimilarQuestion {
  question: string
  answer: string
  hint: string
}

export default function AiSolveResultPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mistakeId = searchParams.get('mistakeId')
  const [result, setResult] = useState<SolveResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([])

  useEffect(() => {
    if (!mistakeId) { setLoading(false); return }
    async function load() {
      const res = await fetch(`/api/mistakes/${mistakeId}`)
      if (res.ok) {
        const { data } = await res.json()
        if (data) setResult(data)
      }
      setLoading(false)
    }
    load()
  }, [mistakeId])

  async function generateSimilar() {
    if (!result) return
    setGenerating(true)
    try {
      const existingTexts = similarQuestions.map(q => q.question)
      const res = await fetch('/api/ai/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: result.subject,
          knowledgePoints: result.knowledge_points,
          answer: result.answer,
          existingQuestions: existingTexts,
          count: 3,
        }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setSimilarQuestions(prev => [...prev, ...data.questions])
        toast.success(`已生成 ${data.questions.length} 道同类题`)
      } else {
        const { error } = await res.json().catch(() => ({ error: '生成同类题失败' }))
        toast.error(error || '生成同类题失败')
      }
    } catch { toast.error('生成同类题失败') }
    finally { setGenerating(false) }
  }

  function addToMistakes() {
    toast.success('已在错题本中')
    router.push('/mistakes')
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-[3px] border-violet-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!result) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-[15px] font-medium">结果不存在</p>
        <button onClick={() => router.push('/camera')} className="mt-4 text-violet-600 text-sm font-bold active:scale-[0.98] transition-transform">去拍摄题目</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="text-sm text-indigo-600 font-bold active:scale-[0.98] transition-transform">&larr; 返回</button>

      {result.image_url && (
        <div className="card overflow-hidden">
          <img src={result.image_url} alt="题目" className="w-full max-h-56 object-contain" />
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <span className="tag bg-violet-50 text-violet-600">{result.subject}</span>
        {result.knowledge_points?.map(p => (
          <span key={p} className="tag bg-blue-50 text-blue-600">{p}</span>
        ))}
      </div>

      <div className="card p-5">
        <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-gray-800 mb-3">
          <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center">
            <Lightbulb className="w-[15px] h-[15px] text-amber-500" />
          </div>
          分析
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">{result.analysis || '暂无分析'}</p>
      </div>

      <div className="card p-5">
        <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-gray-800 mb-3">
          <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center">
            <ListChecks className="w-[15px] h-[15px] text-blue-500" />
          </div>
          解题步骤
        </h3>
        {result.steps?.length > 0 ? (
          <ol className="space-y-2.5">
            {result.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600">
                <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-gray-400">暂无步骤</p>}
      </div>

      <div className="card p-5">
        <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-gray-800 mb-3">
          <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="w-[15px] h-[15px] text-emerald-500" />
          </div>
          答案
        </h3>
        <p className="text-lg font-extrabold text-emerald-700">{result.answer || '暂无答案'}</p>
      </div>

      <button onClick={addToMistakes}
        className="w-full h-[52px] bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-2xl text-[15px] font-bold active:scale-[0.98] transition-all duration-200 shadow-[0_4px_20px_rgba(251,146,60,0.3)]">
        查看错题本
      </button>

      {similarQuestions.length === 0 && (
        <button onClick={generateSimilar} disabled={generating}
          className="w-full h-[48px] bg-violet-50 text-violet-600 rounded-2xl text-sm font-bold active:scale-[0.98] disabled:opacity-50 transition-all duration-200 hover:bg-violet-100">
          {generating ? '生成中...' : '推荐相似题型'}
        </button>
      )}

      {similarQuestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-extrabold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-[18px] h-[18px] text-violet-500" />
            相似题型推荐 ({similarQuestions.length}道)
          </h3>
          {similarQuestions.map((q, i) => (
            <div key={i} className="card p-4">
              <p className="text-xs font-bold text-violet-500">题目 {i + 1}</p>
              <p className="text-sm text-gray-700 mt-2 leading-relaxed">{q.question}</p>
              <details className="mt-4">
                <summary className="text-sm text-violet-600 font-bold cursor-pointer">查看答案</summary>
                <div className="mt-3 pl-1 space-y-1.5">
                  <p className="text-sm text-emerald-700 font-bold">{q.answer}</p>
                  <p className="text-xs text-gray-400 font-medium">提示：{q.hint}</p>
                </div>
              </details>
            </div>
          ))}

          <button onClick={generateSimilar} disabled={generating}
            className="w-full h-[48px] bg-violet-100 text-violet-700 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 transition-all duration-200 hover:bg-violet-200">
            <RefreshCw className={`w-[15px] h-[15px] ${generating ? 'animate-spin' : ''}`} />
            {generating ? '生成中...' : '继续生成更多相似题'}
          </button>
        </div>
      )}
    </div>
  )
}
