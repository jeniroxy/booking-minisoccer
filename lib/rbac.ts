export type AdminRole = 'admin' | 'finance' | 'karyawan'

export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  admin:    ['/admin', '/admin/slots', '/admin/vouchers', '/admin/ps', '/admin/keuangan', '/admin/settings'],
  finance:  ['/admin', '/admin/ps', '/admin/keuangan', '/admin/settings'],
  karyawan: ['/admin', '/admin/ps', '/admin/settings'],
}

export const API_PERMISSIONS: Record<AdminRole, string[]> = {
  admin:    ['/api/admin'],
  finance:  ['/api/admin/bookings', '/api/admin/ps', '/api/admin/reports', '/api/admin/revenue', '/api/admin/expenses', '/api/admin/expense-categories', '/api/admin/capital-expenses', '/api/admin/push', '/api/admin/me', '/api/admin/auto-revenue'],
  karyawan: ['/api/admin/bookings', '/api/admin/ps', '/api/admin/push', '/api/admin/me'],
}

export function canAccessPage(role: AdminRole, pathname: string): boolean {
  if (role === 'admin') return true
  return ROLE_PERMISSIONS[role].some(p =>
    p === pathname || (p !== '/admin' && pathname.startsWith(p + '/'))
  )
}

export function canAccessApi(role: AdminRole, pathname: string): boolean {
  if (role === 'admin') return true
  return API_PERMISSIONS[role].some(prefix => pathname.startsWith(prefix))
}

export function getDefaultPage(role: AdminRole): string {
  return ROLE_PERMISSIONS[role][0]
}
