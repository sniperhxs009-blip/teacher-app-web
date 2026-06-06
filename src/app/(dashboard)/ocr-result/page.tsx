'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { FileSpreadsheet, Wand2, Tag } from 'lucide-react'
import toast from 'react-hot-toast'

function getColLabel(n: number): string {
  let label = ''
  n = n + 1
  while (n > 0) {
    const r = (n - 1) % 26
    label = String.fromCharCode(65 + r) + label
    n = Math.floor((n - 1) / 26)
  }
  return label
}

interface OcrResult {
  id: string
  original_image: string
  recognized_data: string[][]
  excel_file: string
  status: string
  row_count: number
  col_count: number
}

export default function OcrResultPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id')
  const [result, setResult] = useState<OcrResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [tableData, setTableData] = useState<string[][]>([])
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [aiCorrecting, setAiCorrecting] = useState(false)
  const [aiClassifying, setAiClassifying] = useState(false)
  const [aiResult, setAiResult] = useState('')

  useEffect(() => {
    if (!id) { setLoading(false); return }
    async function load() {
      const res = await fetch(`/api/ocr-results?id=${id}`)
      if (res.ok) {
        const { data } = await res.json()
        setResult(data)
        const grid: string[][] = Array.isArray(data.recognized_data) ? data.recognized_data : [[]]
        setTableData(grid)
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function saveOnly() {
    if (!result) return
    setSaving(true)
    const res = await fetch('/api/ocr-results', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: result.id, corrected_data: tableData, status: 'saved' }),
    })
    if (res.ok) {
      toast.success('已保存')
      setResult({ ...result, recognized_data: tableData })
    } else {
      toast.error('保存失败')
    }
    setSaving(false)
  }

  async function archiveToSheets() {
    if (!result || tableData.length === 0) { toast.error('无表格数据'); return }
    setSaving(true)
    const headers = tableData[0]?.map((_, i) => getColLabel(i)) || []
    const rows = tableData.map(row => row.map(c => c || ''))
    const res = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `拍照识别 ${new Date().toLocaleDateString('zh-CN')}`,
        headers,
        rows,
      }),
    })
    if (res.ok) {
      toast.success('已归档到表格库')
      router.push('/sheets')
    } else {
      toast.error('归档失败')
    }
    setSaving(false)
  }

  async function aiCorrect() {
    const text = tableData.map(row => row.join('\t')).join('\n')
    if (text.trim().length < 5) { toast.error('内容不足，无法纠错'); return }
    setAiCorrecting(true)
    setAiResult('')
    try {
      const res = await fetch('/api/ai/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: '表格',
          knowledgePoints: ['OCR纠错'],
          answer: text,
          action: 'correct',
          count: 0,
        }),
      })
      if (res.ok) {
        const { data } = await res.json()
        const corrected = data?.questions?.[0]?.question || data?.questions?.[0]?.answer || ''
        if (corrected) {
          const lines = corrected.split('\n').filter((l: string) => l.trim())
          const newData = lines.map((line: string) => line.split('\t'))
          const maxCols = tableData[0]?.length || 1
          const normalized = newData.map((row: string[]) => {
            while (row.length < maxCols) row.push('')
            return row.slice(0, maxCols)
          })
          while (normalized.length < tableData.length) normalized.push(Array(maxCols).fill(''))
          setTableData(normalized)
          setAiResult('AI纠错完成')
          toast.success('AI纠错完成')
        }
      } else {
        toast.error('AI纠错失败')
      }
    } catch { toast.error('AI纠错失败') }
    finally { setAiCorrecting(false) }
  }

  async function aiClassify() {
    const text = tableData.map(row => row.join('\t')).join('\n')
    if (text.trim().length < 10) { toast.error('内容不足，无法分类'); return }
    setAiClassifying(true)
    setAiResult('')
    try {
      const res = await fetch('/api/ai/similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: '表格',
          knowledgePoints: ['智能分类'],
          answer: text,
          action: 'classify',
          count: 0,
        }),
      })
      if (res.ok) {
        const { data } = await res.json()
        const classification = data?.questions?.[0]?.question || ''
        if (classification) {
          setAiResult(classification)
          toast.success('AI分类完成')
        }
      } else {
        toast.error('AI分类失败')
      }
    } catch { toast.error('AI分类失败') }
    finally { setAiClassifying(false) }
  }

  function addRow() {
    const colCount = tableData[0]?.length || 1
    setTableData([...tableData, Array(colCount).fill('')])
  }

  function deleteRow() {
    if (tableData.length <= 1) { toast.error('至少保留一行'); return }
    setTableData(tableData.slice(0, -1))
  }

  function updateCell(r: number, c: number, value: string) {
    const newData = tableData.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : [...row]
    )
    setTableData(newData)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full" /></div>
  }

  if (!result) {
    return <div className="text-center py-16 text-gray-400 text-[15px]">结果不存在</div>
  }

  const colCount = tableData[0]?.length || 0
  const colLabels = Array.from({ length: colCount }, (_, i) => getColLabel(i))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="text-[14px] text-blue-600 font-semibold active:scale-[0.98] transition-transform">&larr; 返回</button>
        <h1 className="text-lg font-bold text-gray-800">识别结果</h1>
        <div className="w-[52px]" />
      </div>

      {/* 提示栏 — 和小程序一致 */}
      <div className="bg-yellow-50 text-yellow-700 text-[12px] px-4 py-2 rounded-xl text-center font-medium">
        识别完成，请仔细核对每个单元格再保存
      </div>

      {/* 状态栏 */}
      <div className="text-center text-[12px] text-gray-500">
        共识别 {tableData.length} 行 × {colCount} 列
      </div>

      {/* 原始图片 */}
      {result.original_image && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <img src={result.original_image} alt="original" className="w-full max-h-48 object-contain" />
        </div>
      )}

      {/* 表格 — Excel样式，带行列号 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-auto" style={{ maxHeight: '60vh' }}>
        <table className="border-collapse text-[13px]">
          {/* 列号表头 */}
          <thead>
            <tr>
              <th className="sticky top-0 z-10 bg-gray-100 border border-gray-200 px-2 py-2 text-center text-[11px] text-gray-500 font-medium min-w-[40px]"></th>
              {colLabels.map((label, ci) => (
                <th key={ci} className="sticky top-0 z-10 bg-blue-50 border border-gray-200 px-3 py-2 text-center text-[12px] text-blue-700 font-semibold min-w-[80px]">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                {/* 行号 */}
                <td className="border border-gray-200 px-2 py-1.5 text-center text-[11px] text-gray-500 font-medium bg-gray-100 sticky left-0">
                  {ri + 1}
                </td>
                {row.map((cell, ci) => {
                  const isEditing = editingCell?.r === ri && editingCell?.c === ci
                  return (
                    <td key={ci} className="border border-gray-200 p-0 min-w-[80px]">
                      {isEditing ? (
                        <input
                          value={cell}
                          onChange={e => updateCell(ri, ci, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          autoFocus
                          className="w-full h-[36px] px-2 text-[13px] outline-none ring-2 ring-blue-500 bg-blue-50/50"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingCell({ r: ri, c: ci })}
                          className="w-full min-h-[36px] px-2 py-2 text-[13px] text-gray-700 cursor-text hover:bg-blue-50/30 transition-colors"
                        >
                          {cell || ' '}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI功能栏 */}
      <div className="flex gap-2">
        <button onClick={aiCorrect} disabled={aiCorrecting}
          className="flex-1 h-[44px] bg-purple-50 text-purple-600 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50 transition-transform">
          <Wand2 className="w-[16px] h-[16px]" />
          {aiCorrecting ? 'AI纠错中...' : 'AI智能纠错'}
        </button>
        <button onClick={aiClassify} disabled={aiClassifying}
          className="flex-1 h-[44px] bg-blue-50 text-blue-600 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50 transition-transform">
          <Tag className="w-[16px] h-[16px]" />
          {aiClassifying ? 'AI分类中...' : 'AI智能分类'}
        </button>
      </div>

      {aiResult && (
        <div className="bg-green-50 text-green-700 text-[13px] px-4 py-3 rounded-xl">
          {aiResult}
        </div>
      )}

      {/* 行操作 */}
      <div className="flex gap-2">
        <button onClick={addRow}
          className="flex-1 h-[40px] bg-white border border-gray-200 text-gray-600 rounded-2xl text-[13px] font-medium active:scale-[0.98] transition-transform">
          + 添加行
        </button>
        <button onClick={deleteRow}
          className="flex-1 h-[40px] bg-white border border-gray-200 text-gray-600 rounded-2xl text-[13px] font-medium active:scale-[0.98] transition-transform">
          - 删除行
        </button>
      </div>

      {/* 底部操作按钮 */}
      <div className="flex gap-3 pb-4">
        <button onClick={saveOnly} disabled={saving}
          className="flex-1 h-[50px] bg-white border-2 border-blue-500 text-blue-600 rounded-2xl text-[15px] font-semibold active:scale-[0.98] disabled:opacity-50 transition-transform">
          {saving ? '保存中...' : '仅保存记录'}
        </button>
        <button onClick={archiveToSheets} disabled={saving}
          className="flex-1 h-[50px] bg-blue-600 text-white rounded-2xl text-[15px] font-semibold active:scale-[0.98] disabled:opacity-50 transition-transform shadow-lg shadow-blue-200/50">
          {saving ? '保存中...' : '归档到表格库'}
        </button>
      </div>

      {result.excel_file && (
        <a href={result.excel_file} target="_blank" rel="noopener noreferrer"
          className="block w-full h-[48px] bg-green-50 text-green-600 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform mb-4">
          <FileSpreadsheet className="w-[18px] h-[18px]" />
          下载 Excel 文件
        </a>
      )}
    </div>
  )
}
