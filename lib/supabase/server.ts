import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { createAdminClient } from './admin'
import type { AdminRole } from '@/lib/rbac'

export function createClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function getServerSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getAdminRole(userId: string): Promise<AdminRole | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', userId)
    .single()
  return data?.role ?? null
}

export async function getAdminProps(): Promise<{ role: AdminRole; userId: string } | null> {
  // Try reading auth info injected by middleware (supports both cookie and Bearer token auth)
  const headerStore = headers()
  const role = headerStore.get('x-admin-role') as AdminRole | null
  const userId = headerStore.get('x-admin-user-id')
  if (role && userId) {
    return { role, userId }
  }

  // Fallback to session-based auth
  const session = await getServerSession()
  if (!session) return null
  const sessionRole = await getAdminRole(session.user.id)
  if (!sessionRole) return null
  return { role: sessionRole, userId: session.user.id }
}

type AuthResult =
  | { error: Response; role?: never; userId?: never }
  | { error?: never; role: AdminRole; userId: string }

export async function requireAdminSession(): Promise<AuthResult> {
  // Try Bearer token auth first (for API clients)
  const headerStore = headers()
  const authHeader = headerStore.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const adminClient = createAdminClient()
    const { data: { user }, error } = await adminClient.auth.getUser(token)
    if (user && !error) {
      const role = await getAdminRole(user.id)
      if (!role) {
        return {
          error: new Response(JSON.stringify({ error: 'Not an admin' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }),
        }
      }
      return { role, userId: user.id }
    }
  }

  // Fall back to cookie-based auth
  const session = await getServerSession()
  if (!session) {
    return {
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }

  const role = await getAdminRole(session.user.id)
  if (!role) {
    return {
      error: new Response(JSON.stringify({ error: 'Not an admin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }

  return { role, userId: session.user.id }
}

export async function requireRole(allowedRoles: AdminRole[]): Promise<AuthResult> {
  const result = await requireAdminSession()
  if (result.error) return result

  if (!allowedRoles.includes(result.role)) {
    return {
      error: new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    }
  }

  return result
}
