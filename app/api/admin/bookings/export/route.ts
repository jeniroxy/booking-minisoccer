import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildCsv, formatDateId } from '@/lib/export-csv'

type Period = 'month' | 'year' | 'all'

function resolveRange(period: Period): { from: string; to: string; label: string; fileLabel: string } {
  const now = new Date()
  const jktStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const [y, m] = jktStr.split('-').map(Number)

  if (period === 'month') {
    const mm = String(m).padStart(2, '0')
    const from = `${y}-${mm}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const to = `${y}-${mm}-${String(lastDay).padStart(2, '0')}`
    const label = new Date(`${from}T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    return { from, to, label, fileLabel: `${y}-${mm}` }
  }
  if (period === 'year') {
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: `Tahun ${y}`, fileLabel: `${y}` }
  }
  return { from: '0000-01-01', to: '9999-12-31', label: 'Seluruhnya', fileLabel: 'all-time' }
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'finance'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get('period') || 'all') as Period
  if (!['month', 'year', 'all'].includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  const { from, to, label, fileLabel } = resolveRange(period)

  try {
    const supabase = createAdminClient()
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('booking_date, team_name, phone, total_price, confirmed_at, time_slots(start_hour, end_hour)')
      .eq('status', 'confirmed')
      .gte('booking_date', from)
      .lte('booking_date', to)
      .order('booking_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    const total = (bookings ?? []).reduce((sum, b) => sum + (b.total_price ?? 0), 0)

    const headerRows: unknown[][] = [
      ['Laporan Booking Confirmed Zains Mini Soccer'],
      ['Periode', label],
      ['Dari', formatDateId(from)],
      ['Sampai', formatDateId(to)],
      ['Total Booking', (bookings ?? []).length],
      ['Total Pemasukan', total],
      ['Digenerate', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })],
    ]

    const dataRows: unknown[][] = [
      ['Tanggal', 'Hari', 'Tim', 'No HP', 'Jam Mulai', 'Jam Selesai', 'Durasi (jam)', 'Harga', 'Dikonfirmasi'],
      ...(bookings ?? []).map(b => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const slot = (b as any).time_slots
        const startH = slot?.start_hour ?? 0
        const endH = slot?.end_hour ?? 0
        const dayName = new Date(b.booking_date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long' })
        return [
          formatDateId(b.booking_date),
          dayName,
          b.team_name,
          b.phone ?? '',
          slot ? `${String(startH).padStart(2, '0')}:00` : '',
          slot ? `${String(endH).padStart(2, '0')}:00` : '',
          slot ? endH - startH : '',
          b.total_price ?? 0,
          b.confirmed_at
            ? new Date(b.confirmed_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
            : '',
        ]
      }),
    ]

    const csv = buildCsv([
      { rows: headerRows },
      { title: 'DAFTAR BOOKING CONFIRMED', rows: dataRows },
    ])

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="booking-confirmed-${fileLabel}.csv"`,
      },
    })
  } catch (err) {
    console.error('Export bookings error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
