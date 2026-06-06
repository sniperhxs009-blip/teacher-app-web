'use client'

import { useEffect, useState, useCallback } from 'react'
import { ClipboardList } from 'lucide-react'

interface Log { id: string; action: string; target_user_id: string; admin_name: string; details: Record<string, unknown>; created_at: string }

const actionLabels: Record<string, string> = {
  approve_user: '通过用户', reject_user: '拒绝用户', freeze_user: '冻结用户', update_user: '更新用户',
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '30' })
    const res = await fetch(`/api/admin/logs?${params}`)
    if (res.ok) {
      const { data, count } = await res.json()
      setLogs((data || []) as Log[])
      setTotal(count || 0)
    }
    setLoading(false)
  }, [page])

  useEffect(() => { setLoading(true); load() }, [load])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">操作日志</h1>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full" /></div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <ClipboardList className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-[15px]">暂无日志</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {logs.map(l => (
            <div key={l.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-gray-800">{actionLabels[l.action] || l.action}</span>
                    <span className="text-[12px] text-gray-400">{l.admin_name}</span>
                  </div>
                  {l.target_user_id && <p className="text-[11px] text-gray-400 mt-1">目标: {l.target_user_id.slice(0, 12)}...</p>}
                  <p className="text-[11px] text-gray-400 mt-0.5">{new Date(l.created_at).toLocaleString('zh-CN')}</p>
                </div>
              </div>
            </div>
          ))}
          {total > 30 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="w-[40px] h-[40px] bg-white rounded-xl shadow-sm disabled:opacity-30 active:scale-[0.98] transition-transform">&lt;</button>
              <span className="text-[13px] text-gray-500">{page} / {Math.ceil(total / 30)}</span>
              <button disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)} className="w-[40px] h-[40px] bg-white rounded-xl shadow-sm disabled:opacity-30 active:scale-[0.98] transition-transform">&gt;</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
