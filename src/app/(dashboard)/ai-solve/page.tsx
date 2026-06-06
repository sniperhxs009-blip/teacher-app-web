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

async function uploadImage(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', 'mistakes')
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '上传失败')
  return data as { publicUrl: string; storagePath: string }
}

export default function AiSolvePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'camera' | 'upload' | null>(null)
  const [solving, setSolving] = useState(false)
  const [result, setResult] = useState<SolveResult | null>(null)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [similarQuestions, setSimilarQuestions] = useState<SimilarQuestion[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function processImage(blob: Blob) {
    setMode(null)
    setSolving(true)
    setError('')
    try {
      const fileName = `${Date.now()}.jpg`
      const file = new File([blob], fileName, { type: 'image/jpeg' })

      const { publicUrl, storagePath } = await uploadImage(file)
      toast.success('图片已上传，AI正在分析...')

      const res = await fetch('/api/ai/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: publicUrl, storagePath }),
      })

      if (res.ok) {
        const { data } = await res.json()
        setResult(data)
        toast.success('AI解题完成')
      } else {
        const err = await res.json().catch(() => ({ error: 'AI解题失败' }))
        setError(err.error || 'AI服务暂不可用，请确认已配置 API Key')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败，请重试'
      setError(msg)
    } finally {
      setSolving(false)
    }
  }

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
        toast.error('生成同类题失败')
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
        const maxW = 800
        let w = img.width, h = img.height
        if (w > maxW) { h = h * maxW / w; w = maxW }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        canvas.toBlob(b => { if (b) processImage(b) }, 'image/jpeg', 0.5)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  function saveToMistakes() {
    if (!result) return
    toast.success('已在错题本中')
    router.push('/mistakes')
  }

  return (
    <div className="space-y-4">
      {mode === 'camera' && (
        <CameraCapture mode="solve" onCapture={processImage} onClose={() => setMode(null)} />
      )}

      <h1 className="text-xl font-bold text-gray-800">AI解题</h1>
      <p className="text-[14px] text-gray-400">拍照或上传题目图片，AI智能分析解答</p>

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
        <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
          <Loader2 className="w-12 h-12 text-purple-500 mx-auto animate-spin mb-4" />
          <p className="text-[15px] font-semibold text-gray-800">AI正在分析题目...</p>
          <p className="text-[13px] text-gray-400 mt-1">这可能需要5-15秒</p>
        </div>
      )}

      {error && !solving && !result && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-[14px] text-red-600 mb-4 whitespace-pre-line text-left">{error}</p>
          <p className="text-[12px] text-gray-400 mb-6 leading-relaxed">
            需在服务器环境变量中配置：<br />
            DOUBAO_API_KEY = 方舟 API Key<br />
            DOUBAO_MODEL_ID = 推理接入点 Endpoint ID（ep- 开头）<br />
            获取：console.volcengine.com/ark → 在线推理 → 推理接入点管理
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setMode('camera')} className="px-6 h-[44px] bg-purple-600 text-white rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-transform">
              重新尝试
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-6 h-[44px] bg-gray-100 text-gray-700 rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-transform">
              上传图片
            </button>
          </div>
        </div>
      )}

      {result && !solving && (
        <div className="space-y-4">
          {result.image_url && (
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <img src={result.image_url} alt="题目" className="w-full max-h-56 object-contain" />
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
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

          {result.steps?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-gray-800 mb-3">
                <ListChecks className="w-[18px] h-[18px] text-blue-500" /> 解题步骤
              </h3>
              <ol className="list-decimal list-inside space-y-2">
                {result.steps.map((s, i) => (
                  <li key={i} className="text-[14px] text-gray-600 pl-2">{s}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-gray-800 mb-2">
              <CheckCircle className="w-[18px] h-[18px] text-green-500" /> 答案
            </h3>
            <p className="text-lg font-bold text-green-700">{result.answer || '暂无答案'}</p>
          </div>

          {/* Similar questions */}
          {similarQuestions.length === 0 && (
            <button onClick={generateSimilar} disabled={generating}
              className="w-full h-[46px] bg-purple-50 text-purple-600 rounded-2xl text-[14px] font-semibold active:scale-[0.98] disabled:opacity-50 transition-transform">
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
              <button onClick={generateSimilar} disabled={generating}
                className="w-full h-[44px] bg-purple-100 text-purple-700 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 transition-transform">
                <RefreshCw className={`w-[14px] h-[14px] ${generating ? 'animate-spin' : ''}`} />
                {generating ? '生成中...' : '继续生成更多相似题'}
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={saveToMistakes}
              className="flex-1 h-[50px] bg-orange-600 text-white rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform shadow-lg shadow-orange-200/50">
              查看错题本
            </button>
            <button onClick={() => { setResult(null); setError(''); setSimilarQuestions([]) }}
              className="w-[50px] h-[50px] bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center active:bg-purple-100 transition-colors">
              <Camera className="w-[20px] h-[20px]" />
            </button>
          </div>
        </div>
      )}

      {!result && !error && !solving && (
        <div className="space-y-3">
          <button onClick={() => setMode('camera')}
            className="w-full bg-white rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-4 text-left">
            <div className="w-[52px] h-[52px] bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Camera className="w-[26px] h-[26px] text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-bold text-gray-800">拍照解题</h3>
              <p className="text-[12px] text-gray-400 mt-0.5">摄像头拍摄题目，AI自动识别分析</p>
            </div>
          </button>

          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="w-full bg-white rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-4 text-left">
            <div className="w-[52px] h-[52px] bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <ImageUp className="w-[26px] h-[26px] text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-bold text-gray-800">上传图片</h3>
              <p className="text-[12px] text-gray-400 mt-0.5">从相册选择题目图片，AI解题</p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
