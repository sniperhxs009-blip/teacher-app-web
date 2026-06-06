'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import CameraCapture from '@/components/camera/CameraCapture'
import { Camera, ImageUp, Lightbulb, ListChecks, CheckCircle, Loader2, AlertCircle, BookOpen, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface SolveResult {
  id: string
  image_url: string
  subject: string
  knowledge_point: string
  analysis: string
  solution_steps: string
  correct_answer: string
}

interface SimilarQuestion {
  question: string
  answer: string
  hint: string
}

async function uploadImage(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', 'mistakes')
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '上传失败')
  return data as { publicUrl: string; storagePath: string }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export default function AiSolvePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'camera' | 'upload' | null>(null)
  const [solving, setSolving] = useState(false)
  const [results, setResults] = useState<SolveResult[]>([])
  const [processingMsg, setProcessingMsg] = useState('')
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([])
  const [expandedIdx, setExpandedIdx] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function processImage(blob: Blob) {
    setMode(null)
    setSolving(true)
    setError('')
    setProcessingMsg('正在上传图片...')

    try {
      const fileName = `${Date.now()}.jpg`
      const file = new File([blob], fileName, { type: 'image/jpeg' })

      setProcessingMsg('正在上传图片...')
      const [{ publicUrl, storagePath }, imageBase64] = await Promise.all([
        uploadImage(file),
        blobToBase64(blob),
      ])

      setProcessingMsg('AI正在分析题目...')
      const res = await fetch('/api/ai/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: publicUrl, storagePath, imageBase64 }),
      })

      if (res.ok) {
        const { data } = await res.json()
        const list = Array.isArray(data) ? data : [data]
        setResults(list)
        toast.success(`AI解题完成，识别到 ${list.length} 道题`)
      } else {
        const err = await res.json().catch(() => ({ error: 'AI解题失败' }))
        setError(err.error || 'AI服务暂不可用')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败，请重试'
      setError(msg)
    } finally {
      setSolving(false)
      setProcessingMsg('')
    }
  }

  async function generateSimilar() {
    if (results.length === 0) return
    setGenerating(true)
    const current = results[expandedIdx]
    try {
      const existingTexts = similarQuestions.map(q => q.question)
      const res = await fetch('/api/ai/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: current.subject,
          knowledgePoints: current.knowledge_point?.split(',').filter(Boolean) || [],
          answer: current.correct_answer,
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

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxW = 600
        let w = img.width, h = img.height
        if (w > maxW) { h = h * maxW / w; w = maxW }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        canvas.toBlob(b => { if (b) processImage(b) }, 'image/jpeg', 0.4)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-5">
      {mode === 'camera' && (
        <CameraCapture mode="solve" onCapture={processImage} onClose={() => setMode(null)} />
      )}

      <div>
        <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">AI解题</h1>
        <p className="text-sm text-gray-400 mt-1 font-medium">拍照或上传题目图片，AI智能分析解答所有题目</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
        onChange={handleFileUpload}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      {solving && (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Loader2 className="w-7 h-7 text-purple-500 animate-spin" />
          </div>
          <p className="text-base font-extrabold text-gray-800">AI正在分析题目...</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">{processingMsg}</p>
        </div>
      )}

      {error && !solving && results.length === 0 && (
        <div className="card p-8 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <p className="text-sm text-red-600 mb-5 whitespace-pre-line text-left font-medium">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setMode('camera')} className="px-6 h-[44px] bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-2xl text-sm font-bold active:scale-[0.98] transition-transform shadow-[0_4px_16px_rgba(139,92,246,0.3)]">
              重新尝试
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-6 h-[44px] bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold active:scale-[0.98] transition-transform">
              上传图片
            </button>
          </div>
        </div>
      )}

      {results.length > 0 && !solving && (
        <div className="space-y-4">
          {/* Result count and switcher */}
          {results.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {results.map((_, i) => (
                <button key={i} onClick={() => { setExpandedIdx(i); setSimilarQuestions([]) }}
                  className={`px-4 py-1.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${expandedIdx === i ? 'bg-violet-600 text-white shadow-md' : 'bg-white text-gray-500 shadow-sm'}`}>
                  第{i + 1}题
                </button>
              ))}
            </div>
          )}

          {(() => {
            const result = results[expandedIdx]
            if (!result) return null
            const steps = result.solution_steps?.split('\n').filter(Boolean) || []

            return (
              <div className="space-y-4">
                {result.image_url && (
                  <div className="card overflow-hidden">
                    <img src={result.image_url} alt="题目" className="w-full max-h-56 object-contain" />
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  <span className="tag bg-violet-50 text-violet-600">{result.subject}</span>
                  {result.knowledge_point?.split(',').filter(Boolean).map((p: string) => (
                    <span key={p} className="tag bg-blue-50 text-blue-600">{p.trim()}</span>
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

                {steps.length > 0 && (
                  <div className="card p-5">
                    <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-gray-800 mb-3">
                      <div className="w-7 h-7 rounded-xl bg-blue-100 flex items-center justify-center">
                        <ListChecks className="w-[15px] h-[15px] text-blue-500" />
                      </div>
                      解题步骤
                    </h3>
                    <ol className="space-y-2.5">
                      {steps.map((s: string, i: number) => (
                        <li key={i} className="flex gap-3 text-sm text-gray-600">
                          <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                          <span className="pt-0.5">{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div className="card p-5">
                  <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-gray-800 mb-3">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="w-[15px] h-[15px] text-emerald-500" />
                    </div>
                    答案
                  </h3>
                  <p className="text-lg font-extrabold text-emerald-700">{result.correct_answer || '暂无答案'}</p>
                </div>

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

                {results.length > 1 && (
                  <div className="flex gap-3">
                    {expandedIdx > 0 && (
                      <button onClick={() => { setExpandedIdx(expandedIdx - 1); setSimilarQuestions([]) }}
                        className="flex-1 h-[44px] bg-gray-100 text-gray-700 rounded-2xl text-sm font-bold active:scale-[0.98] transition-transform">
                        ← 上一题
                      </button>
                    )}
                    {expandedIdx < results.length - 1 && (
                      <button onClick={() => { setExpandedIdx(expandedIdx + 1); setSimilarQuestions([]) }}
                        className="flex-1 h-[44px] bg-violet-100 text-violet-700 rounded-2xl text-sm font-bold active:scale-[0.98] transition-transform">
                        下一题 →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })()}

          <div className="flex gap-3">
            <button onClick={() => router.push('/mistakes')}
              className="flex-1 h-[52px] bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-2xl text-[15px] font-bold active:scale-[0.98] transition-all duration-200 shadow-[0_4px_20px_rgba(251,146,60,0.3)]">
              查看错题本 ({results.length}道)
            </button>
            <button onClick={() => { setResults([]); setError(''); setSimilarQuestions([]); setExpandedIdx(0) }}
              className="w-[52px] h-[52px] bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center active:bg-violet-100 transition-colors">
              <Camera className="w-[20px] h-[20px]" />
            </button>
          </div>
        </div>
      )}

      {results.length === 0 && !error && !solving && (
        <div className="space-y-3">
          {[
            { icon: Camera, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600', label: '拍照解题', desc: '摄像头拍摄试卷，AI解答所有题目', action: () => setMode('camera') },
            { icon: ImageUp, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-600', label: '上传图片', desc: '从相册选择试卷图片，AI解答所有题目', action: () => fileInputRef.current?.click() },
          ].map(item => {
            const Icon = item.icon
            return (
              <button key={item.label} onClick={item.action}
                className="card card-press w-full p-5 flex items-center gap-4 text-left">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.1)]`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-extrabold text-gray-800">{item.label}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">{item.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
