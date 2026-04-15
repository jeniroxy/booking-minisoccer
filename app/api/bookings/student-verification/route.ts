import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Check if a team already has student verification
export async function GET(request: NextRequest) {
  const teamName = request.nextUrl.searchParams.get('team_name')
  if (!teamName?.trim()) {
    return NextResponse.json({ verified: false })
  }

  const supabase = createClient()
  const { data } = await supabase
    .from('student_verifications')
    .select('id, school_name, card_image_url')
    .ilike('team_name', teamName.trim())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    verified: !!data,
    school_name: data?.school_name ?? null,
  })
}

// Submit new student verification
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const teamName = formData.get('team_name') as string
  const schoolName = formData.get('school_name') as string
  const cardImage = formData.get('card_image') as File | null

  if (!teamName?.trim() || !schoolName?.trim() || !cardImage) {
    return NextResponse.json(
      { error: 'team_name, school_name, and card_image are required' },
      { status: 400 }
    )
  }

  // Validate file type
  if (!cardImage.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File harus berupa gambar' }, { status: 400 })
  }

  // Max 5MB
  if (cardImage.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Ukuran file maksimal 5MB' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Upload image to Supabase Storage
  const ext = cardImage.name.split('.').pop() || 'jpg'
  const fileName = `${Date.now()}-${teamName.trim().replace(/\s+/g, '_').toLowerCase()}.${ext}`
  const buffer = Buffer.from(await cardImage.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('student-cards')
    .upload(fileName, buffer, {
      contentType: cardImage.type,
      upsert: false,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return NextResponse.json({ error: 'Gagal upload kartu pelajar' }, { status: 500 })
  }

  const { data: publicUrl } = supabase.storage
    .from('student-cards')
    .getPublicUrl(fileName)

  // Save verification record
  const { error: insertError } = await supabase
    .from('student_verifications')
    .insert({
      team_name: teamName.trim(),
      school_name: schoolName.trim(),
      card_image_url: publicUrl.publicUrl,
    })

  if (insertError) {
    console.error('Insert error:', insertError)
    return NextResponse.json({ error: 'Gagal menyimpan data verifikasi' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
