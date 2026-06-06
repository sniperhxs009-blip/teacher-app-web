'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileSpreadsheet, Search, Upload, X, Download, Trash2, FileText, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

interface Sheet {
  id: string
  user_id: string
  title: string
  file_url: string
  file_type: string
  file_size: number
  subject: string
  grade: string
  exam_type: string
  exam_date: string | null
  keywords: string
  download_count: number
  created_at: string
}

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理', '其他']
const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']
const EXAM_TYPES = ['随堂练习', '单元测试', '月考', '期中', '期末', '模拟考', '高考真题', '其他']

export default function SheetsPage() {
  const [sheets, setSheets] = useState<Sheet[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [userId, setUserId] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    title: '', subject: '', grade: '', examType: '', examDate: '', keywords: '',
  })
  const [file, setFile] = useState<File | null>(null)

  const loadSheets = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const params = new URLSearchParams({ userId: user.id, page: String(page), limit: '20' })
    if (search) params.set('search', search)

    const res = await fetch(`/api/sheets?${params}`)
    if (res.ok) {
      const { data, count } = await res.json()
      setSheets(data || [])
      setTotal(count || 0)
    }
    setLoading(false)
  }, [search, page])

  useEffect(() => { loadSheets() }, [loadSheets])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !uploadForm.title) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', userId)
      formData.append('title', uploadForm.title)
      formData.append('subject', uploadForm.subject)
      formData.append('grade', uploadForm.grade)
      formData.append('examType', uploadForm.examType)
      formData.append('examDate', uploadForm.examDate)
      formData.append('keywords', uploadForm.keywords)

      const res = await fetch('/api/sheets', { method: 'POST', body: formData })
      if (res.ok) {
        toast.success('上传成功')
        setShowUpload(false)
        setFile(null)
        setUploadForm({ title: '', subject: '', grade: '', examType: '', examDate: '', keywords: '' })
        loadSheets()
      } else {
        const { error } = await res.json()
        toast.error(error || '上传失败')
      }
    } catch { toast.error('上传失败') }
    finally { setUploading(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('确定删除这个表格？')) return
    const res = await fetch(`/api/sheets/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('已删除')
      loadSheets()
    } else {
      const { error } = await res.json().catch(() => ({ error: '删除失败' }))
      toast.error(error || '删除失败')
    }
  }

  async function handleDownload(sheet: Sheet) {
    await fetch(`/api/sheets/${sheet.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ download_count: (sheet.download_count || 0) + 1 }),
    })
    window.open(sheet.file_url, '_blank')
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / 1048576).toFixed(1)}MB`
  }

  const inputClass = "w-full h-[48px] px-5 bg-gray-50 border-0 rounded-2xl text-[15px] outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all duration-200"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">表格库</h1>
        <button onClick={() => setShowUpload(true)}
          className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 h-[40px] rounded-2xl text-sm font-bold active:scale-[0.98] transition-all duration-200 shadow-[0_4px_16px_rgba(99,102,241,0.3)]">
          <Plus className="w-[18px] h-[18px]" /> 上传
        </button>
      </div>

      <div className="relative">
        <Search className="w-[18px] h-[18px] text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="搜索表格..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full h-[46px] pl-11 pr-4 bg-white border-0 rounded-2xl text-[15px] outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-[3px] border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : sheets.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileSpreadsheet className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-[15px] font-bold text-gray-400">{search ? '没有找到匹配的表格' : '还没有上传表格'}</p>
          <button onClick={() => setShowUpload(true)} className="mt-4 text-indigo-600 text-sm font-bold active:scale-[0.98] transition-transform">上传第一个表格</button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sheets.map(s => (
            <div key={s.id} className="card card-press px-4 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-[15px] text-gray-800 truncate">{s.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {s.subject && <span className="tag bg-indigo-50 text-indigo-600">{s.subject}</span>}
                    {s.grade && <span className="tag bg-emerald-50 text-emerald-600">{s.grade}</span>}
                    {s.exam_type && <span className="tag bg-violet-50 text-violet-600">{s.exam_type}</span>}
                    <span className="tag bg-gray-100 text-gray-500 uppercase">{s.file_type}</span>
                    <span className="text-[11px] text-gray-400 font-medium">{formatSize(s.file_size)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2.5 font-medium">
                    {new Date(s.created_at).toLocaleDateString('zh-CN')} · 下载 {s.download_count || 0} 次
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button onClick={() => handleDownload(s)}
                    className="w-[38px] h-[38px] flex items-center justify-center text-indigo-600 active:bg-indigo-50 rounded-xl transition-colors">
                    <Download className="w-[18px] h-[18px]" />
                  </button>
                  <button onClick={() => handleDelete(s.id)}
                    className="w-[38px] h-[38px] flex items-center justify-center text-red-400 active:bg-red-50 rounded-xl transition-colors">
                    <Trash2 className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {total > 20 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="w-[40px] h-[40px] flex items-center justify-center bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] disabled:opacity-30 active:scale-[0.98] transition-transform">
                <ChevronLeft className="w-[18px] h-[18px] text-gray-600" />
              </button>
              <span className="text-sm text-gray-500 font-bold">{page} / {Math.ceil(total / 20)}</span>
              <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}
                className="w-[40px] h-[40px] flex items-center justify-center bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] disabled:opacity-30 active:scale-[0.98] transition-transform">
                <ChevronRight className="w-[18px] h-[18px] text-gray-600" />
              </button>
            </div>
          )}
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowUpload(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up shadow-[0_-4px_40px_rgba(0,0,0,0.1)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 sticky top-0 bg-white/90 backdrop-blur-xl z-10">
              <h2 className="text-lg font-extrabold text-gray-800">上传表格</h2>
              <button onClick={() => setShowUpload(false)} className="w-[38px] h-[38px] flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">文件 <span className="text-red-500">*</span></label>
                <label className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-5 transition-all duration-200 ${file ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 active:border-indigo-400'}`}>
                  <input type="file" accept=".xlsx,.xls,.csv,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
                  {file ? (
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center"><FileText className="w-[18px] h-[18px] text-indigo-600" /></div>
                      <span className="text-sm text-indigo-600 font-bold truncate max-w-[200px]">{file.name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <Upload className="w-5 h-5" />
                      <span className="text-sm font-medium">点击选择 Excel/PDF 文件</span>
                    </div>
                  )}
                </label>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">标题 <span className="text-red-500">*</span></label>
                <input type="text" required value={uploadForm.title} onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="如：2024年高一期中数学试卷" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">科目</label>
                  <select value={uploadForm.subject} onChange={e => setUploadForm(f => ({ ...f, subject: e.target.value }))} className={inputClass}>
                    <option value="">选择科目</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">年级</label>
                  <select value={uploadForm.grade} onChange={e => setUploadForm(f => ({ ...f, grade: e.target.value }))} className={inputClass}>
                    <option value="">选择年级</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">考试类型</label>
                  <select value={uploadForm.examType} onChange={e => setUploadForm(f => ({ ...f, examType: e.target.value }))} className={inputClass}>
                    <option value="">选择类型</option>
                    {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">考试日期</label>
                  <input type="date" value={uploadForm.examDate} onChange={e => setUploadForm(f => ({ ...f, examDate: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">关键词</label>
                <input type="text" value={uploadForm.keywords} onChange={e => setUploadForm(f => ({ ...f, keywords: e.target.value }))} className={inputClass} placeholder="多个关键词用逗号分隔" />
              </div>
              <button type="submit" disabled={uploading || !file}
                className="btn-primary">
                {uploading ? '上传中...' : '确认上传'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
