'use client'

import { useEffect, useState } from 'react'
import { Settings, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface ConfigItem {
  id: string
  key: string
  value: string
  description: string
}

const CONFIG_FIELDS = [
  { key: 'DEEPSEEK_API_KEY', label: 'DeepSeek API Key', desc: '用于AI智能推荐和相似题生成' },
  { key: 'DOUBAO_API_KEY', label: '豆包 (Doubao) API Key', desc: '用于AI拍照解题的视觉识别' },
  { key: 'DOUBAO_MODEL_ID', label: '豆包模型 ID', desc: '默认: doubao-seed-1-6-vision-250428' },
  { key: 'BAIDU_API_KEY', label: '百度 OCR API Key', desc: '用于拍照识别表格和文字' },
  { key: 'BAIDU_SECRET_KEY', label: '百度 OCR Secret Key', desc: '百度OCR密钥' },
]

export default function AdminConfigPage() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/config')
      .then(r => r.json())
      .then(({ data }) => {
        const map: Record<string, string> = {}
        ;(data || []).forEach((item: ConfigItem) => { map[item.key] = item.value })
        setConfig(map)
        setLoading(false)
      })
  }, [])

  async function saveConfig(key: string, value: string) {
    setSaving(key)
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) {
        toast.success(`${key} 已保存`)
        setConfig(prev => ({ ...prev, [key]: value }))
      } else {
        const { error } = await res.json().catch(() => ({ error: '保存失败' }))
        toast.error(error || '保存失败')
      }
    } catch { toast.error('保存失败') }
    finally { setSaving(null) }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">系统设置</h1>

      <div className="space-y-3">
        {CONFIG_FIELDS.map(field => {
          const value = config[field.key] || ''
          const isSaving = saving === field.key
          return (
            <div key={field.key} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{field.label}</p>
                  <p className="text-xs text-gray-400">{field.desc}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type={field.key.includes('SECRET') || field.key.includes('KEY') ? 'password' : 'text'}
                  value={value}
                  onChange={e => setConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="flex-1 h-[44px] px-4 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 focus:bg-white transition-all"
                  placeholder={`输入${field.label}`}
                />
                <button
                  onClick={() => saveConfig(field.key, config[field.key] || '')}
                  disabled={isSaving}
                  className="h-[44px] px-5 bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-50 transition-transform"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? '...' : '保存'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
