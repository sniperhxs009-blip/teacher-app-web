'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { FileSearch, Lightbulb, FileSpreadsheet, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { compressImageBlob, blobToBase64 } from '@/lib/compress-image'

const CameraCapture = dynamic(() => import('@/components/camera/CameraCapture'), { ssr: false })

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
  const [processingMsg, setProcessingMsg] = useState('')

  async function handleCapture(blob: Blob, captureMode: string) {
    setCapturing(true)
    try {
      setProcessingMsg('正在压缩图片...')
      const compressed = await compressImageBlob(blob, 960, 0.45)
      const fileName = `${Date.now()}.jpg`
      const file = new File([compressed], fileName, { type: 'image/jpeg' })

      if (captureMode === 'ocr') {
        const [{ publicUrl, storagePath }, imageBase64] = await Promise.all([
          uploadImage(file, 'ocr'),
          blobToBase64(compressed),
        ])
        setProcessingMsg('正在识别...')

        const res = await fetch('/api/ocr/recognize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: publicUrl, storagePath, imageBase64 }),
        })
        if (res.ok) {
          const { data: result } = await res.json()
          toast.success('识别完成')
          router.push(`/ocr-result?id=${result.id}`)
        } else {
          const err = await res.json().catch(() => ({}))
          toast.error(err.error || 'OCR识别失败')
          setCapturing(false)
          setMode(null)
        }
      } else if (captureMode === 'solve') {
        const [{ publicUrl, storagePath }, imageBase64] = await Promise.all([
          uploadImage(file, 'mistakes'),
          blobToBase64(compressed),
        ])
        setProcessingMsg('AI快速解题中...')

        const res = await fetch('/api/ai/solve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: publicUrl, storagePath, imageBase64 }),
        })
        if (res.ok) {
          const { data } = await res.json()
          const list = Array.isArray(data) ? data : [data]
          sessionStorage.setItem('ai_solve_results', JSON.stringify(list))
          toast.success(`解题完成，共 ${list.length} 道题`)
          router.push('/ai-solve')
        } else {
          const err = await res.json().catch(() => ({}))
          toast.error(err.error || 'AI解题失败')
          setCapturing(false)
          setMode(null)
        }
      } else if (captureMode === 'table') {
        setProcessingMsg('正在保存...')
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', `拍照表格 ${new Date().toLocaleDateString('zh-CN')}`)

        const res = await fetch('/api/sheets', { method: 'POST', body: formData })
        if (res.ok) {
          toast.success('已保存到表格库')
          router.push('/sheets')
        } else {
          const err = await res.json().catch(() => ({}))
          toast.error(err.error || '上传失败')
          setCapturing(false)
          setMode(null)
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '操作失败')
      setCapturing(false)
      setMode(null)
    }
  }

  return (
    <>
      {capturing && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl px-8 py-7 text-center shadow-lg">
            <div className="w-12 h-12 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-5" />
            <p className="text-gray-600 text-base font-bold">{processingMsg}</p>
          </div>
        </div>
      )}

      {mode && (
        <CameraCapture mode={mode} onCapture={handleCapture} onClose={() => setMode(null)} />
      )}

      <div className="space-y-4">
        <h1 className="text-xl font-extrabold text-gray-800">拍照</h1>
        <div className="space-y-3">
          {[
            { mode: 'ocr' as const, icon: FileSearch, color: 'from-blue-500 to-cyan-500', label: '拍照识别', desc: '拍摄试卷表格，自动识别' },
            { mode: 'solve' as const, icon: Lightbulb, color: 'from-violet-500 to-purple-600', label: '拍照解题', desc: '拍摄试卷，AI快速解答' },
            { mode: 'table' as const, icon: FileSpreadsheet, color: 'from-emerald-500 to-teal-500', label: '拍照上传表格', desc: '拍摄后保存到表格库' },
          ].map(item => {
            const Icon = item.icon
            return (
              <button key={item.mode} onClick={() => setMode(item.mode)}
                className="card card-press w-full p-4 flex items-center gap-4 text-left">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-extrabold text-gray-800">{item.label}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
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
