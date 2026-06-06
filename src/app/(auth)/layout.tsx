export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-5">
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
