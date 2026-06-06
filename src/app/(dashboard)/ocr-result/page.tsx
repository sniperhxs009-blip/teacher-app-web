'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Save, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'

interface OcrResult {
  id: string
  original_image: string
  recognized_data: { tables?: Array<{ cells: Array<Array<{ text: string }>> }>; text?: string[] }
  excel_file: string
  status: string
}

export default function OcrResultPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get('id')
  const [result, setResult] = useState<OcrResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<string[][]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    async function load() {
      const res = await fetch(`/api/ocr-results?id=${id}`)
      if (res.ok) {
        const { data } = await res.json()
        setResult(data)
        const grid = data.recognized_data?.tables?.[0]?.cells?.map(
          (row: Array<{ text: string }>) => row.map((cell: { text: string }) => cell.text)
        ) || [[]]
        setEditData(grid)
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function saveCorrections() {
    if (!result) return
    setSaving(true)
    const res = await fetch('/api/ocr-results', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: result.id,
        corrected_data: { tables: [{ cells: editData.map(row => row.map(text => ({ text }))) }] },
        status: 'corrected',
      }),
    })
    if (res.ok) {
      toast.success('已保存修改')
      setEditing(false)
    } else {
      toast.error('保存失败')
    }
    setSaving(false)
  }

  async function saveToSheets() {
    if (!result) return
    const cells = result.recognized_data?.tables?.[0]?.cells
    if (!cells || cells.length === 0) { toast.error('无表格数据'); return }
    setSaving(true)

    const headers = cells[0]?.map((c: { text: string }) => c.text).filter(Boolean) || []
    const dataRows = cells.slice(1).map((row: Array<{ text: string }>) =>
      row.map((c: { text: string }) => c.text)
    )

    const res = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `识别表格 ${new Date().toLocaleDateString('zh-CN')}`,
        headers,
        rows: dataRows,
      }),
    })
    if (res.ok) {
      toast.success('已保存到表格库')
      router.push('/sheets')
    } else {
      toast.error('保存失败')
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full" /></div>
  }

  if (!result) {
    return <div className="text-center py-16 text-gray-400 text-[15px]">结果不存在</div>
  }

  const cells = result.recognized_data?.tables?.[0]?.cells
  const isTable = cells && cells.length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="text-[14px] text-blue-600 font-semibold active:scale-[0.98] transition-transform">&larr; 返回</button>
        <h1 className="text-lg font-bold text-gray-800">识别结果</h1>
        <div className="flex items-center gap-3">
          {isTable && (
            <button onClick={() => setEditing(!editing)} className="text-[14px] text-blue-600 font-semibold active:scale-[0.98] transition-transform">
              {editing ? '预览' : '编辑'}
            </button>
          )}
        </div>
      </div>

      {result.original_image && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <img src={result.original_image} alt="original" className="w-full max-h-56 object-contain" />
        </div>
      )}

      {isTable ? (
        <>
          {editing ? (
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <tbody>
                  {editData.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="border border-gray-200 p-0.5">
                          <input
                            value={cell}
                            onChange={e => {
                              const newData = [...editData]
                              if (!newData[ri]) newData[ri] = []
                              newData[ri][ci] = e.target.value
                              setEditData(newData)
                            }}
                            className="w-full h-[38px] px-2 py-1 bg-gray-50 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-[14px] transition"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <tbody>
                  {cells.map((row: Array<{ text: string }>, ri: number) => (
                    <tr key={ri} className={ri === 0 ? 'bg-blue-50/50' : ri % 2 === 0 ? 'bg-gray-50/50' : ''}>
                      {row.map((cell: { text: string }, ci: number) => (
                        <td key={ci} className={`border border-gray-100 px-3 py-2.5 text-gray-700 ${ri === 0 ? 'font-semibold text-gray-800 text-center' : ''}`}>
                          {cell.text}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : result.recognized_data?.text ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="text-[13px] font-semibold text-gray-700 mb-2">识别文本</h3>
          <p className="text-[14px] text-gray-600 whitespace-pre-wrap">{result.recognized_data.text.join('\n')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <p className="text-gray-400 text-[15px]">暂无识别数据</p>
        </div>
      )}

      <div className="space-y-2.5">
        {editing && (
          <button onClick={saveCorrections} disabled={saving}
            className="w-full h-[50px] bg-blue-600 text-white rounded-2xl text-[15px] font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-blue-200/50">
            {saving ? '保存中...' : '保存修改'}
          </button>
        )}

        {isTable && !editing && (
          <button onClick={saveToSheets} disabled={saving}
            className="w-full h-[50px] bg-green-600 text-white rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 shadow-lg shadow-green-200/50">
            <Save className="w-[18px] h-[18px]" />
            {saving ? '保存中...' : '保存到表格库'}
          </button>
        )}

        {result.excel_file && (
          <a href={result.excel_file} target="_blank" rel="noopener noreferrer"
            className="w-full h-[50px] bg-white border-2 border-green-500 text-green-600 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            <FileSpreadsheet className="w-[18px] h-[18px]" />
            下载 Excel 文件
          </a>
        )}
      </div>
    </div>
  )
}
