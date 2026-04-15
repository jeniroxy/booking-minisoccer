import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await requireAdminSession()
  if (auth.error) return auth.error

  const supabase = createAdminClient()

  // Get latest verification per team (distinct on team_name)
  const { data, error } = await supabase
    .from('student_verifications')
    .select('team_name, school_name, card_image_url')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json([], { status: 200 })
  }

  // Deduplicate: keep latest per team_name (already sorted desc)
  const seen = new Set<string>()
  const unique = []
  for (const d of data ?? []) {
    const key = d.team_name.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(d)
    }
  }

  return NextResponse.json(unique)
}
