function formatPriceIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function buildWAUrl(params: {
  teamName: string
  dateLabel: string
  startHour: number
  endHour: number
  totalPrice: number
  isStudent: boolean
  voucherCode?: string
  waNumber: string
}): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const timeRange = `${pad(params.startHour)}:00-${pad(params.endHour)}:00`
  const priceFormatted = formatPriceIDR(params.totalPrice)

  const lines = [
    'A mau booking lapang buat:',
    '',
    `Nama Tim: ${params.teamName}`,
    `Tanggal: ${params.dateLabel}`,
    `Jam: ${timeRange}`,
    `Kategori: ${params.isStudent ? 'Pelajar' : 'Umum'}`,
  ]
  if (params.voucherCode) {
    lines.push(`Voucher: ${params.voucherCode}`)
  }
  lines.push(`Total Harga: ${priceFormatted}`, '', 'Mohon konfirmasi ketersediaan. Terima kasih!')

  return `whatsapp://send?phone=${params.waNumber}&text=${encodeURIComponent(lines.join('\n'))}`
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function buildConfirmUrl(booking: {
  phone: string | null
  team_name: string
  booking_date: string
  time_slots: { start_hour: number; end_hour: number; price: number } | null
  total_price: number | null
}): string | null {
  if (!booking.phone) return null
  const phone = booking.phone.replace(/\D/g, '')

  const [year, month, day] = booking.booking_date.split('-').map(Number)
  const dateLabel = formatDateLabel(new Date(year, month - 1, day))

  const pad = (n: number) => String(n).padStart(2, '0')
  const timeRange = booking.time_slots
    ? `${pad(booking.time_slots.start_hour)}:00–${pad(booking.time_slots.end_hour)}:00`
    : '–'

  const price = booking.total_price ?? booking.time_slots?.price ?? 0
  const priceFormatted = formatPriceIDR(price)

  const lines = [
    `Tos di booking ya a, atas nama ${booking.team_name} 🎉`,
    `📅 ${dateLabel} · ${timeRange}`,
    `💰 ${priceFormatted}`,
    'Di antos kasumpingana! ⚽',
    'Toleransi waktu 15 menit, lebih dari 15 menit waktu akan langsung dimulai.',
  ]

  return `whatsapp://send?phone=${phone}&text=${encodeURIComponent(lines.join('\n'))}`
}
