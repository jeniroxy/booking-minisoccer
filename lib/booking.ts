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
  const priceFormatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(params.totalPrice)

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

  return `https://api.whatsapp.com/send?phone=${params.waNumber}&text=${encodeURIComponent(lines.join('\n'))}`
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
