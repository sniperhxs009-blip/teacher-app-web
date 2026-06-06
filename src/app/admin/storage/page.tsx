'use client'

import { useEffect, useState } from 'react'
import { HardDrive, Trash2, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

interface FileRecord {
  id: string
  user_id: string
  nickname: string
  url: string
  storage_path: string
  name: string
  created_at: string
  bucket: string
}

const BUCKETS = [
  { key: 'sheets', label: '表格文件', icon: '📊' },
  { key: 'mistakes', label: '错题图片', icon: '📷' },
  { key: 'ocr', label: 'OCR图片', icon: '📄' },
]

export default function AdminStoragePage() {
  const [bucket, setBucket] = useState('sheets')
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch(`/api/admin/storage?bucket=${bucket}&page=${page}&limit=20`)
      .then(r => r.json())
      .then(({ data, total: t }) => {
        setFiles(data || [])
        setTotal(t || 0)
        setLoading(false)
      })
  }

  useEffect(() => { setPage(1) }, [bucket])
  useEffect(() => { load() }, [bucket, page]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(file: FileRecord) {
    if (!confirm(`确定删除 ${file.nickname} 的 "${file.name}"？此操作不可恢复。`)) return
    setDeleting(file.id)
    const res = await fetch(`/api/admin/storage?bucket=${file.bucket}&path=${encodeURIComponent(file.storage_path)}&id=${encodeURIComponent(file.id)}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('已删除')
      load()
    } else {
      const { error } = await res.json().catch(() => ({ error: '删除失败' }))
      toast.error(error || '删除失败')
    }
    setDeleting(null)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">文件管理</h1>

      {/* Bucket tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {BUCKETS.map(b => (
          <button
            key={b.key}
            onClick={() => setBucket(b.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              bucket === b.key
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-gray-500 shadow-sm active:scale-[0.98]'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-[3px] border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <HardDrive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">暂无文件</p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map(f => {
            const ext = f.storage_path?.split('.').pop()?.toLowerCase()
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')
            return (
              <div key={f.id} className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-start gap-3">
                  {isImage && f.url ? (
                    <img src={f.url} alt="" className="w-14 h-14 rounded-xl object-cover bg-gray-50 flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <HardDrive className="w-6 h-6 text-indigo-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">
                      {typeof f.name === 'string' ? (f.name.length > 30 ? f.name.slice(0, 30) + '...' : f.name) : '未命名'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{f.nickname} · {new Date(f.created_at).toLocaleDateString('zh-CN')}</p>
                    <p className="text-[10px] text-gray-300 mt-0.5 truncate">{f.storage_path}</p>
                    {f.url && (
                      <a href={f.url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-500 font-medium mt-1 active:text-indigo-700">
                        <ExternalLink className="w-3 h-3" />查看文件
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(f)}
                    disabled={deleting === f.id}
                    className="w-8 h-8 flex items-center justify-center text-red-400 active:bg-red-50 rounded-lg flex-shrink-0 disabled:opacity-50"
                  >
                    <Trash2 className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {total > 20 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm disabled:opacity-30 active:scale-[0.98]">
            <ChevronLeft className="w-[18px] h-[18px] text-gray-600" />
          </button>
          <span className="text-sm text-gray-500 font-medium">{page} / {Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}
            className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm disabled:opacity-30 active:scale-[0.98]">
            <ChevronRight className="w-[18px] h-[18px] text-gray-600" />
          </button>
        </div>
      )}
    </div>
  )
}
