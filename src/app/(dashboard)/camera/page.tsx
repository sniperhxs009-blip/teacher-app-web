'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CameraCapture from '@/components/camera/CameraCapture'
import { FileSearch, Lightbulb, FileSpreadsheet, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

type CameraMode = 'ocr' | 'solve' | 'table' | null

async function uploadImage(file: File, bucket: 'ocr' | 'mistakes' | 'sheets') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', bucket)
  const res = await fetch('/api/upload', { method: 'POST', body: formData })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || '上传失败')
  return data as { publicUrl: string; storagePath: string }
}

export default function CameraPage() {
  const router = useRouter()
  const [mode, setMode] = useState<CameraMode>(null)
  const [capturing, setCapturing] = useState(false)

  async function handleCapture(blob: Blob, captureMode: string) {
    setCapturing(true)
    try {
      const fileName = `${Date.now()}.jpg`
      const file = new File([blob], fileName, { type: 'image/jpeg' })

      if (captureMode === 'ocr') {
        const { publicUrl, storagePath } = await uploadImage(file, 'ocr')
        toast.success('图片已上传，正在识别...')

        const res = await fetch('/api/ocr/recognize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: publicUrl, storagePath }),
        })
        if (res.ok) {
          const { data: result } = await res.json()
          router.push(`/ocr-result?id=${result.id}`)
        } else {
          const err = await res.json().catch(() => ({}))
          toast.error(err.error || 'OCR识别失败，请重试')
        }
      } else if (captureMode === 'solve') {
        const { publicUrl, storagePath } = await uploadImage(file, 'mistakes')
        toast.success('图片已上传，AI正在解题...')

        const res = await fetch('/api/ai/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: publicUrl, storagePath }),
        })
        if (res.ok) {
          const { data: mistake } = await res.json()
          router.push(`/ai-solve/result?mistakeId=${mistake.id}`)
        } else {
          const err = await res.json().catch(() => ({}))
          toast.error(err.error || 'AI解题失败，请重试')
        }
      } else if (captureMode === 'table') {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', `拍照表格 ${new Date().toLocaleDateString('zh-CN')}`)

        const res = await fetch('/api/sheets', { method: 'POST', body: formData })
        if (res.ok) {
          toast.success('图片已保存到表格库')
          router.push('/sheets')
        } else {
          const err = await res.json().catch(() => ({}))
          toast.error(err.error || '上传失败，请重试')
        }
      }

      setMode(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败，请重试'
      toast.error(msg)
    } finally {
      setCapturing(false)
    }
  }

  return (
    <>
      {capturing && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl px-8 py-7 text-center shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
            <div className="w-12 h-12 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
            <p className="text-gray-600 text-base font-bold">处理中...</p>
            <p className="text-sm text-gray-400 mt-1 font-medium">请稍候</p>
          </div>
        </div>
      )}

      {mode && (
        <CameraCapture mode={mode} onCapture={handleCapture} onClose={() => setMode(null)} />
      )}

      <div className="space-y-4">
        <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">拍照</h1>

        <div className="space-y-3">
          {[
            { mode: 'ocr' as const, icon: FileSearch, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-600', label: '拍照识别', desc: '拍摄试卷表格，自动识别为电子表格' },
            { mode: 'solve' as const, icon: Lightbulb, color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600', label: '拍照解题', desc: '拍摄题目，AI智能分析解答' },
            { mode: 'table' as const, icon: FileSpreadsheet, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600', label: '拍照上传表格', desc: '拍摄后直接保存到表格库' },
          ].map(item => {
            const Icon = item.icon
            return (
              <button key={item.mode} onClick={() => setMode(item.mode)}
                className="card card-press w-full p-4 flex items-center gap-4 text-left">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.1)]`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-extrabold text-gray-800">{item.label}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">{item.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
