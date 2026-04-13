// Helpers untuk generate CSV yang bisa dibuka di Excel dengan UTF-8 BOM

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function csvRow(cells: unknown[]): string {
  return cells.map(csvEscape).join(',')
}

export function buildCsv(sections: Array<{
  title?: string
  rows: unknown[][]
}>): string {
  const lines: string[] = []
  sections.forEach((section, idx) => {
    if (idx > 0) lines.push('')
    if (section.title) {
      lines.push(csvRow([section.title]))
    }
    for (const row of section.rows) {
      lines.push(csvRow(row))
    }
  })
  // UTF-8 BOM supaya Excel baca karakter Indonesia dengan benar
  return '\uFEFF' + lines.join('\r\n')
}

export function formatDateId(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr.length === 10 ? dateStr + 'T00:00:00' : dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
