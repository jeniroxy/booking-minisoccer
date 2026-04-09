import { PsPricingRule } from './types'

export function getDayType(date: Date): 'weekday' | 'weekend' {
  const day = date.getDay()
  return day === 0 || day === 6 ? 'weekend' : 'weekday'
}

export function getApplicableRules(
  rules: PsPricingRule[],
  unitType: 'PS4' | 'PS5',
  sessionDate: Date
): PsPricingRule[] {
  const dayType = getDayType(sessionDate)
  const dateStr = sessionDate.toISOString().split('T')[0]

  return rules
    .filter(r => {
      if (!r.is_active) return false
      if (r.unit_type !== 'all' && r.unit_type !== unitType) return false
      if (!r.day_types.includes(dayType)) return false
      if (r.valid_from && dateStr < r.valid_from) return false
      if (r.valid_until && dateStr > r.valid_until) return false
      return true
    })
    .sort((a, b) => b.priority - a.priority)
}

export interface BillOption {
  rule: PsPricingRule
  amount: number
  label: string
}

export function calculateBillOptions(
  durationMinutes: number,
  unitType: 'PS4' | 'PS5',
  sessionDate: Date,
  rules: PsPricingRule[]
): BillOption[] {
  const applicable = getApplicableRules(rules, unitType, sessionDate)
  const options: BillOption[] = []

  for (const rule of applicable) {
    if (rule.rule_type === 'hourly') {
      const hours = Math.ceil(durationMinutes / 60)
      options.push({
        rule,
        amount: hours * rule.price,
        label: `${rule.name} (${hours} jam × Rp ${rule.price.toLocaleString('id-ID')})`,
      })
    } else if (rule.rule_type === 'package' && rule.duration_minutes) {
      if (durationMinutes <= rule.duration_minutes) {
        options.push({
          rule,
          amount: rule.price,
          label: `${rule.name} (Rp ${rule.price.toLocaleString('id-ID')})`,
        })
      } else {
        const packages = Math.ceil(durationMinutes / rule.duration_minutes)
        options.push({
          rule,
          amount: packages * rule.price,
          label: `${rule.name} × ${packages} (Rp ${(packages * rule.price).toLocaleString('id-ID')})`,
        })
      }
    } else if (rule.rule_type === 'promo') {
      const hours = Math.ceil(durationMinutes / 60)
      options.push({
        rule,
        amount: hours * rule.price,
        label: `${rule.name} (${hours} jam × Rp ${rule.price.toLocaleString('id-ID')})`,
      })
    }
  }

  return options.sort((a, b) => a.amount - b.amount)
}

export function computeElapsedSeconds(
  startedAt: string,
  pausedAt: string | null,
  totalPausedSeconds: number
): number {
  const start = new Date(startedAt).getTime()
  const now = pausedAt ? new Date(pausedAt).getTime() : Date.now()
  const elapsed = Math.floor((now - start) / 1000) - totalPausedSeconds
  return Math.max(0, elapsed)
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`
}
