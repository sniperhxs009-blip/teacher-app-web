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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center modal-backdrop">
          <div className="bg-white rounded-2xl px-8 py-6 text-center shadow-lg">
            <div className="animate-spin w-10 h-10 border-[3px] border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600 text-[15px] font-medium">处理中...</p>
          </div>
        </div>
      )}

      {mode && (
        <CameraCapture mode={mode} onCapture={handleCapture} onClose={() => setMode(null)} />
      )}

      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-800">拍照</h1>

        <div className="space-y-2.5">
          <button onClick={() => setMode('ocr')} className="w-full bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-4 text-left">
            <div className="w-[48px] h-[48px] bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <FileSearch className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-bold text-gray-800">拍照识别</h3>
              <p className="text-[12px] text-gray-400 mt-0.5">拍摄试卷表格，自动识别为Excel</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
          </button>

          <button onClick={() => setMode('solve')} className="w-full bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-4 text-left">
            <div className="w-[48px] h-[48px] bg-purple-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-bold text-gray-800">拍照解题</h3>
              <p className="text-[12px] text-gray-400 mt-0.5">拍摄题目，AI智能分析解答</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
          </button>

          <button onClick={() => setMode('table')} className="w-full bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform flex items-center gap-4 text-left">
            <div className="w-[48px] h-[48px] bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-bold text-gray-800">拍照上传表格</h3>
              <p className="text-[12px] text-gray-400 mt-0.5">拍摄后直接保存到表格库</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
          </button>
        </div>
      </div>
    </>
  )
}
