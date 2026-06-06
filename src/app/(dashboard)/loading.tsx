export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-gray-100">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-medium">加载中...</p>
      </div>
    </div>
  )
}
