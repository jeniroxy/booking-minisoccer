import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildCsv, formatDateId } from '@/lib/export-csv'

const CATEGORY_LABELS: Record<string, string> = {
  mini_soccer: 'Mini Soccer',
  kantin: 'Kantin',
  ps: 'PS Rental',
  sewa_sepatu: 'Sewa Sepatu',
  photography: 'Photography',
}

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
  const period = (searchParams.get('period') || 'month') as Period
  if (!['month', 'year', 'all'].includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }

  const { from, to, label, fileLabel } = resolveRange(period)

  try {
    const supabase = createAdminClient()
    const [
      { data: bookings },
      { data: revenueEntries },
      { data: psSessions },
      { data: expenseEntries },
      { data: capitalExpenses },
    ] = await Promise.all([
      supabase
        .from('bookings')
        .select('booking_date, team_name, total_price, time_slots(start_hour, end_hour)')
        .eq('status', 'confirmed')
        .gte('booking_date', from)
        .lte('booking_date', to)
        .order('booking_date', { ascending: true }),
      supabase
        .from('revenue_entries')
        .select('date, category, amount, notes')
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true }),
      supabase
        .from('ps_sessions')
        .select('started_at, customer_name, final_amount, duration_minutes')
        .eq('status', 'completed')
        .order('started_at', { ascending: true }),
      supabase
        .from('expense_entries')
        .select('date, amount, description, expense_categories(name)')
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true }),
      supabase
        .from('capital_expenses')
        .select('date, description, amount, section, notes')
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: true }),
    ])

    // Filter PS sessions by Jakarta date dalam range
    const psInRange = (psSessions ?? []).filter(s => {
      const d = new Date(s.started_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
      return d >= from && d <= to
    })

    // Aggregate totals
    const bookingTotal = (bookings ?? []).reduce((sum, b) => sum + (b.total_price ?? 0), 0)
    const psTotal = psInRange.reduce((sum, s) => sum + (s.final_amount ?? 0), 0)
    const revByCat: Record<string, number> = {}
    for (const r of revenueEntries ?? []) {
      revByCat[r.category] = (revByCat[r.category] ?? 0) + r.amount
    }
    const revTotal = Object.values(revByCat).reduce((a, b) => a + b, 0)
    const expTotal = (expenseEntries ?? []).reduce((sum, e) => sum + e.amount, 0)
    const capTotal = (capitalExpenses ?? []).reduce((sum, c) => sum + c.amount, 0)
    const grandRevenue = bookingTotal + psTotal + revTotal
    const net = grandRevenue - expTotal - capTotal

    // Build sections
    const summaryRows: unknown[][] = [
      ['Laporan Keuangan Zains Mini Soccer'],
      ['Periode', label],
      ['Dari', formatDateId(from)],
      ['Sampai', formatDateId(to)],
      ['Digenerate', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })],
      [],
      ['RINGKASAN'],
      ['Item', 'Jumlah'],
      ['Pemasukan Booking Lapang', bookingTotal],
      ['Pemasukan PS Rental', psTotal],
      ...Object.entries(revByCat).map(([cat, amt]) => [`Pemasukan ${CATEGORY_LABELS[cat] ?? cat}`, amt]),
      ['Total Pemasukan', grandRevenue],
      [],
      ['Total Pengeluaran Operasional', expTotal],
      ['Total Belanja Besar', capTotal],
      ['Total Pengeluaran', expTotal + capTotal],
      [],
      ['Saldo Bersih', net],
    ]

    const bookingRows: unknown[][] = [
      ['Tanggal', 'Tim', 'Jam Mulai', 'Jam Selesai', 'Harga'],
      ...(bookings ?? []).map(b => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const slot = (b as any).time_slots
        return [
          formatDateId(b.booking_date),
          b.team_name,
          slot ? `${String(slot.start_hour).padStart(2, '0')}:00` : '',
          slot ? `${String(slot.end_hour).padStart(2, '0')}:00` : '',
          b.total_price ?? 0,
        ]
      }),
    ]

    const psRows: unknown[][] = [
      ['Tanggal', 'Nama', 'Durasi (menit)', 'Jumlah'],
      ...psInRange.map(s => [
        formatDateId(new Date(s.started_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })),
        s.customer_name,
        s.duration_minutes ?? '',
        s.final_amount ?? 0,
      ]),
    ]

    const revenueRows: unknown[][] = [
      ['Tanggal', 'Kategori', 'Jumlah', 'Catatan'],
      ...(revenueEntries ?? []).map(r => [
        formatDateId(r.date),
        CATEGORY_LABELS[r.category] ?? r.category,
        r.amount,
        r.notes ?? '',
      ]),
    ]

    const expenseRows: unknown[][] = [
      ['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah'],
      ...(expenseEntries ?? []).map(e => [
        formatDateId(e.date),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any).expense_categories?.name ?? '',
        e.description ?? '',
        e.amount,
      ]),
    ]

    const capitalRows: unknown[][] = [
      ['Tanggal', 'Bagian', 'Deskripsi', 'Jumlah', 'Catatan'],
      ...(capitalExpenses ?? []).map(c => [
        formatDateId(c.date),
        c.section === 'kantin' ? 'Kantin' : 'Mini Soccer',
        c.description,
        c.amount,
        c.notes ?? '',
      ]),
    ]

    const csv = buildCsv([
      { rows: summaryRows },
      { title: 'DETAIL BOOKING LAPANG', rows: bookingRows },
      { title: 'DETAIL PS RENTAL', rows: psRows },
      { title: 'DETAIL PEMASUKAN LAIN', rows: revenueRows },
      { title: 'DETAIL PENGELUARAN OPERASIONAL', rows: expenseRows },
      { title: 'DETAIL BELANJA BESAR', rows: capitalRows },
    ])

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="laporan-keuangan-${fileLabel}.csv"`,
      },
    })
  } catch (err) {
    console.error('Export report error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
