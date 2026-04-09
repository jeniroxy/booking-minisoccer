import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { canAccessPage, getDefaultPage, type AdminRole } from '@/lib/rbac'

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/admin/login') {
    return NextResponse.next()
  }

  // Clone request headers so we can inject auth info for downstream pages
  const requestHeaders = new Headers(request.headers)

  const supabase = createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            requestHeaders.set(name, value)
          )
        },
      },
    }
  )

  // Use service role client for admin queries
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Try Bearer token auth first, then fall back to cookies
  let userId: string | null = null
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const { data: { user } } = await adminClient.auth.getUser(token)
    if (user) userId = user.id
  }

  if (!userId) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) userId = session.user.id
  }

  if (!userId) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  const { data: adminUser } = await adminClient
    .from('admin_users')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (!adminUser) {
    return NextResponse.redirect(new URL('/admin/login?error=not_admin', request.url))
  }

  const role = adminUser.role as AdminRole
  const pathname = request.nextUrl.pathname

  // Check page access for non-API routes
  if (!pathname.startsWith('/api/') && !canAccessPage(role, pathname)) {
    return NextResponse.redirect(new URL(getDefaultPage(role), request.url))
  }

  // Pass auth info via request headers for downstream server components
  requestHeaders.set('x-admin-role', role)
  requestHeaders.set('x-admin-user-id', userId)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  // Prevent proxy caching of authenticated pages (responses vary by user role)
  response.headers.set('Cache-Control', 'no-store, must-revalidate')
  response.headers.set('Vary', 'Authorization, Cookie')

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
