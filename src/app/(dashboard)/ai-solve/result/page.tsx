'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lightbulb, ListChecks, CheckCircle, BookOpen } from 'lucide-react'
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

export default function AiSolveResultPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const mistakeId = searchParams.get('mistakeId')
  const [result, setResult] = useState<SolveResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [similarQuestions, setSimilarQuestions] = useState<Array<{ question: string; answer: string; hint: string }> | null>(null)

  useEffect(() => {
    if (!mistakeId) { setLoading(false); return }
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const params = new URLSearchParams({ userId: user.id, limit: '100' })
      const res = await fetch(`/api/mistakes?${params}`)
      if (res.ok) {
        const { data } = await res.json()
        const found = data?.find((m: SolveResult) => m.id === mistakeId)
        if (found) setResult(found)
      }
      setLoading(false)
    }
    load()
  }, [mistakeId])

  async function generateSimilar() {
    if (!result) return
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: result.subject,
          knowledgePoints: result.knowledge_points,
          answer: result.answer,
        }),
      })
      if (res.ok) {
        const { data } = await res.json()
        setSimilarQuestions(data.questions)
      } else {
        toast.error('生成同类题失败')
      }
    } catch { toast.error('生成同类题失败') }
    finally { setGenerating(false) }
  }

  async function addToMistakes() {
    if (!result) return
    const res = await fetch(`/api/mistakes/${result.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'ai_solve' }),
    })
    if (res.ok) {
      toast.success('已加入错题本')
      router.push('/mistakes')
    } else {
      toast.error('操作失败')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-[3px] border-purple-600 border-t-transparent rounded-full" /></div>
  }

  if (!result) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-[15px]">结果不存在</p>
        <button onClick={() => router.push('/camera')} className="mt-4 text-purple-600 text-[14px] font-semibold active:scale-[0.98] transition-transform">去拍摄题目</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="text-[14px] text-blue-600 font-semibold active:scale-[0.98] transition-transform">← 返回</button>

      {result.image_url && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <img src={result.image_url} alt="题目" className="w-full max-h-64 object-contain" />
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] bg-purple-50 text-purple-600 px-2 py-1 rounded-md font-medium">{result.subject}</span>
        {result.knowledge_points?.map(p => (
          <span key={p} className="text-[11px] bg-blue-50 text-blue-600 px-2 py-1 rounded-md font-medium">{p}</span>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-gray-800 mb-2">
          <Lightbulb className="w-[18px] h-[18px] text-yellow-500" /> 分析
        </h3>
        <p className="text-[14px] text-gray-600 leading-relaxed">{result.analysis || '暂无分析'}</p>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-gray-800 mb-3">
          <ListChecks className="w-[18px] h-[18px] text-blue-500" /> 解题步骤
        </h3>
        {result.steps?.length > 0 ? (
          <ol className="list-decimal list-inside space-y-2">
            {result.steps.map((s, i) => (
              <li key={i} className="text-[14px] text-gray-600 pl-2">{s}</li>
            ))}
          </ol>
        ) : <p className="text-[14px] text-gray-400">暂无步骤</p>}
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-[15px] font-bold text-gray-800 mb-2">
          <CheckCircle className="w-[18px] h-[18px] text-green-500" /> 答案
        </h3>
        <p className="text-lg font-bold text-green-700">{result.answer || '暂无答案'}</p>
      </div>

      <button onClick={addToMistakes} className="w-full h-[50px] bg-orange-600 text-white rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform shadow-lg shadow-orange-200/50">
        加入错题本
      </button>

      {!similarQuestions && (
        <button onClick={generateSimilar} disabled={generating} className="w-full h-[50px] bg-purple-50 text-purple-600 rounded-2xl text-[15px] font-semibold active:scale-[0.98] disabled:opacity-50 transition-transform">
          {generating ? '生成中...' : '生成同类题'}
        </button>
      )}

      {similarQuestions && (
        <div className="space-y-3">
          <h3 className="text-[15px] font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-[18px] h-[18px] text-purple-500" /> 同类题推荐
          </h3>
          {similarQuestions.map((q, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-[13px] font-semibold text-gray-800">题目 {i + 1}</p>
              <p className="text-[14px] text-gray-600 mt-1.5">{q.question}</p>
              <details className="mt-3">
                <summary className="text-[13px] text-purple-600 font-medium cursor-pointer active:scale-[0.98] transition-transform">查看答案</summary>
                <p className="text-[14px] text-green-700 mt-2 font-medium">{q.answer}</p>
                <p className="text-[12px] text-gray-400 mt-1">提示：{q.hint}</p>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
