import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const serviceClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } },
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/pending'
  const isApiRoute = pathname.startsWith('/api/')

  if (isApiRoute) return supabaseResponse

  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profile) {
      const isAdmin = profile.role === 'admin' || profile.role === 'super_admin'
      const isApproved = profile.status === 'approved'
      const needsPending = profile.status === 'pending' || profile.status === 'rejected' || profile.status === 'frozen'

      if (isAuthPage && pathname !== '/pending') {
        const url = request.nextUrl.clone()
        if (!isApproved && needsPending) {
          url.pathname = '/pending'
        } else if (isAdmin) {
          url.pathname = '/admin/dashboard'
        } else {
          url.pathname = '/home'
        }
        return NextResponse.redirect(url)
      }

      if (!isAuthPage && needsPending && pathname !== '/pending') {
        const url = request.nextUrl.clone()
        url.pathname = '/pending'
        return NextResponse.redirect(url)
      }

      if (!isAuthPage && isApproved && pathname === '/pending') {
        const url = request.nextUrl.clone()
        url.pathname = isAdmin ? '/admin/dashboard' : '/home'
        return NextResponse.redirect(url)
      }

      if (pathname.startsWith('/admin')) {
        if (!isAdmin) {
          const url = request.nextUrl.clone()
          url.pathname = '/home'
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return supabaseResponse
}
