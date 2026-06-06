'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CameraCapture from '@/components/camera/CameraCapture'
import { Camera, ImageUp, Lightbulb, ListChecks, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
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

export default function AiSolvePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'camera' | 'upload' | null>(null)
  const [solving, setSolving] = useState(false)
  const [result, setResult] = useState<SolveResult | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function processImage(blob: Blob) {
    setMode(null)
    setSolving(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { toast.error('请先登录'); return }

      const fileName = `${Date.now()}.jpg`
      const storagePath = `${user.id}/${fileName}`
      const file = new File([blob], fileName, { type: 'image/jpeg' })

      const { error: upErr } = await supabase.storage.from('mistakes').upload(storagePath, file, {
        contentType: 'image/jpeg', upsert: false,
      })
      if (upErr) { toast.error('上传失败: ' + upErr.message); return }

      const { data: urlData } = supabase.storage.from('mistakes').getPublicUrl(storagePath)
      toast.success('图片已上传，AI正在分析...')

      const res = await fetch('/api/ai/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: urlData.publicUrl, storagePath, userId: user.id }),
      })

      if (res.ok) {
        const { data } = await res.json()
        setResult(data)
        toast.success('AI解题完成')
      } else {
        const err = await res.json().catch(() => ({ error: 'AI解题失败' }))
        setError(err.error || 'AI服务暂不可用，请确认已配置 API Key')
      }
    } catch {
      setError('AI服务调用失败，请检查网络连接')
    } finally {
      setSolving(false)
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const canvas = document.createElement('canvas')
      const img = new Image()
      img.onload = () => {
        const maxW = 1920
        let w = img.width, h = img.height
        if (w > maxW) { h = h * maxW / w; w = maxW }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        canvas.toBlob(b => { if (b) processImage(b) }, 'image/jpeg', 0.85)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  async function saveToMistakes() {
    if (!result) return
    setSaving(true)
    const res = await fetch(`/api/mistakes/${result.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'ai_solve' }),
    })
    if (res.ok) {
      toast.success('已保存到错题本')
      router.push('/mistakes')
    } else {
      toast.error('保存失败')
    }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {/* Camera modal */}
      {mode === 'camera' && (
        <CameraCapture mode="solve" onCapture={processImage} onClose={() => setMode(null)} />
      )}

      <h1 className="text-xl font-bold text-gray-800">AI解题</h1>
      <p className="text-[14px] text-gray-400">拍照或上传题目图片，AI智能分析解答</p>

      {/* Hidden file input */}
      <input id="ai-solve-upload" type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

      {/* Solving state */}
      {solving && (
        <div className="bg-white rounded-2xl p-10 shadow-sm text-center">
          <Loader2 className="w-12 h-12 text-purple-500 mx-auto animate-spin mb-4" />
          <p className="text-[15px] font-semibold text-gray-800">AI正在分析题目...</p>
          <p className="text-[13px] text-gray-400 mt-1">这可能需要5-15秒</p>
        </div>
      )}

      {/* Error state */}
      {error && !solving && !result && (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-[14px] text-red-600 mb-4">{error}</p>
          <p className="text-[12px] text-gray-400 mb-6">
            需要配置豆包 (Doubao) Vision API Key<br />
            获取地址: console.volcengine.com/ark
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => setMode('camera')} className="px-6 h-[44px] bg-purple-600 text-white rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-transform">
              重新尝试
            </button>
            <label htmlFor="ai-solve-upload" className="px-6 h-[44px] bg-gray-100 text-gray-700 rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center">
              上传图片
            </label>
          </div>
        </div>
      )}

      {/* Result */}
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

          <div className="flex gap-3">
            <button onClick={saveToMistakes} disabled={saving}
              className="flex-1 h-[50px] bg-orange-600 text-white rounded-2xl text-[15px] font-semibold active:scale-[0.98] disabled:opacity-50 transition-transform shadow-lg shadow-orange-200/50">
              {saving ? '保存中...' : '保存到错题本'}
            </button>
            <button onClick={() => { setResult(null); setError('') }}
              className="w-[50px] h-[50px] bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center active:bg-purple-100 transition-colors">
              <Camera className="w-[20px] h-[20px]" />
            </button>
          </div>
        </div>
      )}

      {/* Action buttons - show when no result/error/solving */}
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

          <label htmlFor="ai-solve-upload"
            className="w-full bg-white rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-4 text-left cursor-pointer">
            <div className="w-[52px] h-[52px] bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <ImageUp className="w-[26px] h-[26px] text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[16px] font-bold text-gray-800">上传图片</h3>
              <p className="text-[12px] text-gray-400 mt-0.5">从相册选择题目图片，AI解题</p>
            </div>
          </label>
        </div>
      )}
    </div>
  )
}
