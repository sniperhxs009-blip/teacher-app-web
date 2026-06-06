'use client'

import { useEffect, useState, useCallback } from 'react'
import { Check, X, Search, ShieldAlert, ShieldCheck, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCached, setCache } from '@/lib/cache'

interface Profile {
  id: string; nickname: string; real_name: string; phone: string; school: string; subject: string
  role: string; status: string; register_time: string; reject_reason: string
}

interface UserData { users: Profile[]; total: number; adminName: string }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'all'>('pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [adminName, setAdminName] = useState('')

  const load = useCallback(async () => {
    // Build cache key from params
    const cacheKey = `admin_users:${tab}:${search}:${page}`
    const cached = getCached<UserData>(cacheKey)
    if (cached) {
      setUsers(cached.users)
      setTotal(cached.total)
      setAdminName(cached.adminName)
      setLoading(false)
      return
    }

    setLoading(true)

    // Get admin name (cached separately)
    const nameCacheKey = 'admin_users_name'
    let name = getCached<string>(nameCacheKey)
    if (!name) {
      const pRes = await fetch('/api/user/profile?userId=' + (await getUserId()))
      if (pRes.ok) {
        const { data: profile } = await pRes.json()
        if (profile) { name = profile.nickname || '管理员'; setCache(nameCacheKey, name) }
      }
    }
    setAdminName(name || '管理员')

    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (tab === 'pending') params.set('status', 'pending')
    if (search) params.set('search', search)

    const res = await fetch(`/api/admin/users?${params}`)
    if (res.ok) {
      const { data, total: t } = await res.json()
      const usersList = (data || []) as Profile[]
      setUsers(usersList)
      setTotal(t || 0)
      setCache(cacheKey, { users: usersList, total: t || 0, adminName: name || '管理员' })
    }
    setLoading(false)
  }, [tab, search, page])

  useEffect(() => { load() }, [load])

  async function handleAction(userId: string, action: string, reason?: string) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: action, rejectReason: reason, adminName }),
      })
      if (res.ok) {
        toast.success(action === 'approved' ? '已通过' : action === 'rejected' ? '已拒绝' : action === 'frozen' ? '已冻结' : '操作成功')
        // Invalidate cache for this tab
        try { Object.keys(sessionStorage).filter(k => k.startsWith('cache:admin_users:')).forEach(k => sessionStorage.removeItem(k)) } catch { /* */ }
        load()
      } else {
        toast.error('操作失败')
      }
    } catch { toast.error('操作失败') }
  }

  const statusLabel: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已拒绝', frozen: '已冻结' }
  const statusColor: Record<string, string> = { pending: 'text-yellow-600 bg-yellow-50', approved: 'text-green-600 bg-green-50', rejected: 'text-red-600 bg-red-50', frozen: 'text-gray-600 bg-gray-100' }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800">用户管理</h1>

      <div className="flex gap-2">
        {(['pending', 'all'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1) }}
            className={`px-4 h-[36px] rounded-xl text-[13px] font-semibold active:scale-[0.98] transition-transform ${
              tab === t ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-500 shadow-sm'
            }`}>
            {t === 'pending' ? '待审核' : '全部用户'}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="w-[18px] h-[18px] text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input type="text" placeholder="搜索用户..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="w-full h-[44px] pl-10 pr-4 bg-white border-0 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full" /></div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <p className="text-gray-400 text-[15px]">{tab === 'pending' ? '没有待审核用户' : '暂无用户'}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold text-gray-800">{u.nickname}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${statusColor[u.status]}`}>{statusLabel[u.status]}</span>
                    {u.role === 'admin' && <ShieldCheck className="w-[14px] h-[14px] text-blue-500" />}
                    {u.role === 'super_admin' && <ShieldAlert className="w-[14px] h-[14px] text-red-500" />}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[12px] text-gray-400">
                    {u.real_name && <span>{u.real_name}</span>}
                    {u.phone && <span>{u.phone}</span>}
                    {u.school && <span>{u.school}</span>}
                    {u.subject && <span>{u.subject}</span>}
                  </div>
                  {u.reject_reason && (
                    <p className="text-[12px] text-red-500 mt-1">拒绝原因：{u.reject_reason}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1.5">{new Date(u.register_time).toLocaleDateString('zh-CN')} 注册</p>
                </div>
                {tab === 'pending' && u.status === 'pending' && (
                  <div className="flex items-center gap-1.5 ml-2">
                    <button onClick={() => handleAction(u.id, 'approved')} className="w-[38px] h-[38px] bg-green-50 text-green-600 rounded-xl flex items-center justify-center active:bg-green-100 transition-colors">
                      <Check className="w-[18px] h-[18px]" />
                    </button>
                    <button onClick={() => {
                      const reason = prompt('拒绝原因（可选）：')
                      handleAction(u.id, 'rejected', reason || '')
                    }} className="w-[38px] h-[38px] bg-red-50 text-red-600 rounded-xl flex items-center justify-center active:bg-red-100 transition-colors">
                      <X className="w-[18px] h-[18px]" />
                    </button>
                  </div>
                )}
                {tab === 'all' && u.role !== 'super_admin' && (
                  <button onClick={() => handleAction(u.id, u.status === 'frozen' ? 'approved' : 'frozen')} className="ml-2 flex-shrink-0">
                    <UserX className={`w-[18px] h-[18px] ${u.status === 'frozen' ? 'text-gray-400' : 'text-red-400'}`} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {total > 20 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="w-[40px] h-[40px] bg-white rounded-xl shadow-sm disabled:opacity-30 active:scale-[0.98] transition-transform flex items-center justify-center">
                <span className="text-gray-600">&lt;</span>
              </button>
              <span className="text-[13px] text-gray-500 font-medium">{page} / {Math.ceil(total / 20)}</span>
              <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="w-[40px] h-[40px] bg-white rounded-xl shadow-sm disabled:opacity-30 active:scale-[0.98] transition-transform flex items-center justify-center">
                <span className="text-gray-600">&gt;</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

async function getUserId(): Promise<string> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || ''
}
