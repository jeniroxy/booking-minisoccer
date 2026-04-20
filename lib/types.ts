export interface TimeSlot {
  id: string
  start_hour: number
  end_hour: number
  price: number
  is_active: boolean
  created_at: string
}

export interface Booking {
  id: string
  team_name: string
  phone: string | null
  booking_date: string   // 'YYYY-MM-DD'
  time_slot_id: string
  status: 'pending' | 'confirmed' | 'cancelled'
  total_price: number | null
  customer_type: 'umum' | 'pelajar'
  voucher_id: string | null
  followup_voucher_id: string | null
  confirmed_by?: string | null
  confirmed_at?: string | null
  created_at: string
  recurring_schedule_id?: string | null
}

export interface BlockedDate {
  id: string
  date: string           // 'YYYY-MM-DD'
  time_slot_id: string | null  // null = full day block
  reason: string | null
  created_at: string
}

export type SlotStatus = 'available' | 'pending' | 'confirmed' | 'blocked' | 'past'

export interface SlotPriceOverride {
  id: string
  date: string           // 'YYYY-MM-DD'
  time_slot_id: string
  price: number
  created_at: string
}

export interface ScheduleData {
  slots: TimeSlot[]
  bookings: Booking[]
  blockedDates: BlockedDate[]
  priceOverrides: SlotPriceOverride[]
}

export type BookingWithSlot = Booking & {
  time_slots: TimeSlot
  vouchers?: { code: string; valid_until: string } | null
  used_voucher?: { code: string; discount_type: 'percent' | 'nominal'; discount_value: number } | null
  confirmed_by_user?: { name: string } | null
}

export interface RecurringSchedule {
  id: string
  team_name: string
  phone: string | null
  customer_type: 'umum' | 'pelajar'
  time_slot_id: string
  day_of_week: number // 0=Minggu, 1=Senin, ..., 6=Sabtu
  is_active: boolean
  created_by: string | null
  created_at: string
  time_slots?: { start_hour: number; end_hour: number; price: number }
}

export interface Voucher {
  id: string
  code: string
  name: string
  discount_type: 'percent' | 'nominal'
  discount_value: number
  max_usage: number | null  // null = unlimited
  valid_from: string   // 'YYYY-MM-DD'
  valid_until: string  // 'YYYY-MM-DD'
  is_active: boolean
  created_at: string
}

// ─── PS Rental Types ────────────────────────────────────────

export interface PsUnit {
  id: string
  name: string
  type: 'PS4' | 'PS5'
  status: 'available' | 'occupied' | 'maintenance'
  display_order: number
  is_active: boolean
  created_at: string
}

export interface PsPricingRule {
  id: string
  name: string
  unit_type: 'PS4' | 'PS5' | 'all'
  rule_type: 'hourly' | 'package' | 'promo'
  price: number
  duration_minutes: number | null
  day_types: string[]
  valid_from: string | null
  valid_until: string | null
  priority: number
  is_active: boolean
  created_at: string
}

export interface PsSession {
  id: string
  ps_unit_id: string
  customer_name: string
  phone: string | null
  status: 'active' | 'paused' | 'completed'
  started_at: string
  paused_at: string | null
  total_paused_seconds: number
  ended_at: string | null
  pricing_rule_id: string | null
  duration_minutes: number | null
  base_amount: number | null
  discount_amount: number
  final_amount: number | null
  payment_method: 'cash' | 'transfer' | 'qris' | null
  notes: string | null
  created_at: string
}

export interface PsBooking {
  id: string
  ps_unit_id: string
  customer_name: string
  phone: string | null
  booking_date: string
  start_hour: number
  duration_hours: number
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  pricing_rule_id: string | null
  estimated_amount: number | null
  created_at: string
}

export type PsSessionWithUnit = PsSession & {
  ps_units: PsUnit
}

export type PsBookingWithUnit = PsBooking & {
  ps_units: PsUnit
}

// ─── Financial Reporting Types ──────────────────────────────

export type RevenueCategory = 'mini_soccer' | 'kantin' | 'ps' | 'sewa_sepatu' | 'photography'

export interface RevenueEntry {
  id: string
  date: string
  category: RevenueCategory
  amount: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ExpenseCategory {
  id: string
  name: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface ExpenseEntry {
  id: string
  date: string
  expense_category_id: string
  amount: number
  description: string | null
  created_at: string
  updated_at: string
}

export type ExpenseEntryWithCategory = ExpenseEntry & {
  expense_categories: ExpenseCategory
}

export type CapitalExpenseSection = 'mini_soccer' | 'kantin'

export interface CapitalExpense {
  id: string
  date: string
  description: string
  amount: number
  notes: string | null
  section: CapitalExpenseSection
  created_at: string
}

export interface CategoryAmount {
  category: string
  amount: number
}

export interface MonthlyBalance {
  month: number
  total_revenue: number
  total_expenses: number
  total_capital_expenses: number
  balance: number
  cumulative_balance: number
}
