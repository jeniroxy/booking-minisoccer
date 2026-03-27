export function buildWAUrl(params: {
  teamName: string
  dateLabel: string
  startHour: number
  endHour: number
  price: number
  waNumber: string
}): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const timeRange = `${pad(params.startHour)}:00-${pad(params.endHour)}:00`
  const priceFormatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(params.price)

  const message = [
    'Halo Admin MiniSoccer!',
    'Saya ingin booking lapangan.',
    '',
    `Nama Tim: ${params.teamName}`,
    `Tanggal: ${params.dateLabel}`,
    `Jam: ${timeRange}`,
    `Harga: ${priceFormatted}`,
    '',
    'Mohon konfirmasi ketersediaan. Terima kasih!',
  ].join('\n')

  return `https://wa.me/${params.waNumber}?text=${encodeURIComponent(message)}`
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
