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
  booking_date: string   // 'YYYY-MM-DD'
  time_slot_id: string
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
}

export interface BlockedDate {
  id: string
  date: string           // 'YYYY-MM-DD'
  time_slot_id: string | null  // null = full day block
  reason: string | null
  created_at: string
}

export type SlotStatus = 'available' | 'pending' | 'confirmed' | 'blocked' | 'past'

export interface ScheduleData {
  slots: TimeSlot[]
  bookings: Booking[]
  blockedDates: BlockedDate[]
}

export type BookingWithSlot = Booking & { time_slots: TimeSlot }

export interface Voucher {
  id: string
  code: string
  name: string
  discount_type: 'percent' | 'nominal'
  discount_value: number
  valid_from: string   // 'YYYY-MM-DD'
  valid_until: string  // 'YYYY-MM-DD'
  is_active: boolean
  created_at: string
}
