const ADMIN_WA = process.env.NEXT_PUBLIC_ADMIN_WA_NUMBER || '6281400842380'

export function buildPsWAUrl(params: {
  customerName: string
  unitName: string
  bookingDate: string
  startHour: number
  durationHours: number
  estimatedAmount?: number
}): string {
  const { customerName, unitName, bookingDate, startHour, durationHours, estimatedAmount } = params

  const date = new Date(bookingDate + 'T00:00:00')
  const dateStr = date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const endHour = startHour + durationHours
  const timeStr = `${String(startHour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`

  let text = `Halo, saya ingin booking PS.\n\n`
  text += `Nama: ${customerName}\n`
  text += `Unit: ${unitName}\n`
  text += `Tanggal: ${dateStr}\n`
  text += `Jam: ${timeStr}\n`
  text += `Durasi: ${durationHours} jam\n`
  if (estimatedAmount) {
    text += `Estimasi: Rp ${estimatedAmount.toLocaleString('id-ID')}\n`
  }

  return `https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(text)}`
}
