import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('revenue_entries')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
  return new NextResponse(null, { status: 204 })
}
