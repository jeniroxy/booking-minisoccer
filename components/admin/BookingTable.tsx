'use client'

import { useState, useRef, useEffect } from 'react'
import { formatHour, formatPrice } from '@/lib/schedule'
import { buildConfirmUrl, normalizePhone } from '@/lib/booking'
import type { BookingWithSlot, TimeSlot } from '@/lib/types'
import { CustomSelect } from '@/components/ui/custom-select'
import {
  Search,
  CalendarDays,
  X,
  Check,
  Ban,
  Trash2,
  MessageCircle,
  Pencil,
  Shield,
} from 'lucide-react'

type Filter = 'pending' | 'confirmed' | 'selesai' | 'cancelled'

const filterConfig: Record<Filter, { label: string; color: string; activeColor: string }> = {
  pending: { label: 'Pending', color: 'text-yellow-400', activeColor: 'bg-yellow-500/15 text-yellow-400' },
  confirmed: { label: 'Akan Main', color: 'text-green-400', activeColor: 'bg-green-500/15 text-green-400' },
  selesai: { label: 'Selesai', color: 'text-blue-400', activeColor: 'bg-blue-500/15 text-blue-400' },
  cancelled: { label: 'Cancelled', color: 'text-slate-400', activeColor: 'bg-slate-600/15 text-slate-300' },
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
}

function getJakartaToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-CA')
}

function formatDayHeader(dateStr: string, todayStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const weekday = d.toLocaleDateString('id-ID', { weekday: 'long' })
  const rest = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const full = `${weekday} ${rest}`
  if (dateStr === todayStr) return `Hari ini, ${full}`
  if (dateStr === addDays(todayStr, 1)) return `Besok, ${full}`
  if (dateStr === addDays(todayStr, -1)) return `Kemarin, ${full}`
  return full
}

function isGroupDone(group: GroupedBooking): boolean {
  if (group.status !== 'confirmed') return false
  const now = new Date()
  const jakartaStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const jakartaHour = parseInt(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: 'numeric', hour12: false }))
  if (group.booking_date < jakartaStr) return true
  if (group.booking_date === jakartaStr && jakartaHour >= group.end_hour) return true
  return false
}

function buildFollowUpUrl(group: GroupedBooking): string | null {
  if (!group.phone) return null
  if (group.total_price < 200000) return null
  const phone = normalizePhone(group.phone)
  const lines = [
    'Hatur nuhun tos maen di Zains Mini Soccer.',
    '',
  ]
  if (group.vouchers) {
    const validUntil = new Date(group.vouchers.valid_until + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })
    lines.push(
      `Spesial buat kamu, ada voucer 50K *${group.vouchers.code}* di booking berikutnya!`,
      `Berlaku sampai ${validUntil} (2 minggu ke depan).`,
      'Note: Voucher akan otomatis terpasang jika menggunakan nama tim yang sama saat main sekarang.',
      '',
    )
  }
  lines.push(
    'Yuk booking lagi di:',
    'https://www.zains.id/jadwal',
    '',
    'Ditunggu kedatangannya lagi ya!',
  )
  return `whatsapp://send?phone=${phone}&text=${encodeURIComponent(lines.join('\n'))}`
}

function EditablePhone({ bookingId, phone, onSaved }: { bookingId: string; phone: string | null; onSaved: (id: string, phone: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(phone ?? '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const save = async () => {
    setSaving(true)
    const res = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: value.trim() }),
    })
    if (res.ok) {
      onSaved(bookingId, value.trim())
      setEditing(false)
    }
    setSaving(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="tel"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setValue(phone ?? '') } }}
          className="bg-slate-900 border border-green-500/50 rounded-lg px-2 py-1 text-[12px] text-slate-100 outline-none w-[130px]"
          disabled={saving}
        />
        <button onClick={save} disabled={saving} className="p-1 rounded-md text-green-400 hover:bg-green-500/15 transition-colors">
          <Check size={13} />
        </button>
        <button onClick={() => { setEditing(false); setValue(phone ?? '') }} className="p-1 rounded-md text-slate-500 hover:bg-slate-700 transition-colors">
          <X size={13} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="group flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
    >
      <span>{phone || '–'}</span>
      <Pencil size={12} className="opacity-0 group-hover:opacity-100 text-slate-500 transition-opacity" />
    </button>
  )
}

function StatusBadge({ status, done }: { status: string; done?: boolean }) {
  const base = 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide'
  if (status === 'pending')
    return <span className={`${base} bg-yellow-500/15 text-yellow-400 ring-1 ring-yellow-500/25`}>Pending</span>
  if (status === 'confirmed') {
    if (done)
      return <span className={`${base} bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/25`}>Selesai</span>
    return <span className={`${base} bg-green-500/15 text-green-400 ring-1 ring-green-500/25`}>Confirmed</span>
  }
  return <span className={`${base} bg-slate-700/50 text-slate-400 ring-1 ring-slate-600/50`}>Cancelled</span>
}

function EditBookingModal({
  booking,
  slots,
  onClose,
  onSaved,
}: {
  booking: BookingWithSlot
  slots: TimeSlot[]
  onClose: () => void
  onSaved: (updated: BookingWithSlot) => void
}) {
  const [date, setDate] = useState(booking.booking_date)
  const [slotId, setSlotId] = useState(booking.time_slot_id)
  const [price, setPrice] = useState(String(booking.total_price ?? booking.time_slots?.price ?? ''))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  const handleSave = async () => {
    setSaving(true)
    const body: Record<string, unknown> = {}
    if (date !== booking.booking_date) body.booking_date = date
    if (slotId !== booking.time_slot_id) body.time_slot_id = slotId
    const priceNum = parseInt(price)
    if (!isNaN(priceNum) && priceNum !== booking.total_price) body.total_price = priceNum

    if (Object.keys(body).length === 0) { onClose(); return }

    const res = await fetch(`/api/admin/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const updated = await res.json()
      onSaved(updated)
      onClose()
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-slate-900/50 backdrop-blur border border-slate-800/80 rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="px-5 pt-5 pb-3 border-b border-slate-800/80">
          <div className="w-9 h-1 bg-slate-600 rounded-full mx-auto mb-4 sm:hidden" />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-bold text-slate-100">Edit Booking</h3>
              <p className="text-[12px] text-slate-500">{booking.team_name}</p>
            </div>
            <button onClick={onClose} className="p-2 -mr-1 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-green-500 transition-colors [color-scheme:dark]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Jam</label>
            <CustomSelect
              value={slotId}
              onChange={setSlotId}
              options={slots.filter(s => s.is_active).map(s => ({
                value: s.id,
                label: `${formatHour(s.start_hour)} – ${formatHour(s.end_hour)}`,
              }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500">Harga (Rp)</label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              min={0}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-[13px] text-slate-100 outline-none focus:border-green-500 transition-colors"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[12px] font-bold bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-[12px] font-bold bg-green-500 text-green-950 hover:bg-green-400 disabled:opacity-40 transition-colors shadow-lg shadow-green-500/20"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface GroupedBooking {
  ids: string[]
  bookings: BookingWithSlot[]
  team_name: string
  phone: string | null
  booking_date: string
  status: string
  start_hour: number
  end_hour: number
  total_price: number
  created_at: string
  vouchers?: { code: string; valid_until: string } | null
  confirmed_by_name: string | null
  primary: BookingWithSlot // first booking, used for actions like WA
}

function groupBookings(bookings: BookingWithSlot[]): GroupedBooking[] {
  // Sort by date, team, start_hour
  const sorted = [...bookings].sort((a, b) => {
    const d = a.booking_date.localeCompare(b.booking_date)
    if (d !== 0) return d
    const t = a.team_name.localeCompare(b.team_name)
    if (t !== 0) return t
    return (a.time_slots?.start_hour ?? 0) - (b.time_slots?.start_hour ?? 0)
  })

  const groups: GroupedBooking[] = []

  for (const b of sorted) {
    const last = groups[groups.length - 1]
    if (
      last &&
      last.team_name === b.team_name &&
      last.booking_date === b.booking_date &&
      last.status === b.status &&
      b.time_slots &&
      last.end_hour === b.time_slots.start_hour
    ) {
      // Merge into existing group
      last.ids.push(b.id)
      last.bookings.push(b)
      last.end_hour = b.time_slots.end_hour
      last.total_price += b.total_price ?? b.time_slots.price ?? 0
      if (!last.phone && b.phone) last.phone = b.phone
      if (!last.vouchers && b.vouchers) last.vouchers = b.vouchers
    } else {
      groups.push({
        ids: [b.id],
        bookings: [b],
        team_name: b.team_name,
        phone: b.phone,
        booking_date: b.booking_date,
        status: b.status,
        start_hour: b.time_slots?.start_hour ?? 0,
        end_hour: b.time_slots?.end_hour ?? 0,
        total_price: b.total_price ?? b.time_slots?.price ?? 0,
        created_at: b.created_at,
        vouchers: b.vouchers,
        confirmed_by_name: b.confirmed_by_user?.name ?? null,
        primary: b,
      })
    }
  }

  return groups
}

export function BookingTable({ initialBookings }: { initialBookings: BookingWithSlot[] }) {
  const [bookings, setBookings] = useState(initialBookings)
  const [filter, setFilter] = useState<Filter>('confirmed')
  const [search, setSearch] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingBooking, setEditingBooking] = useState<BookingWithSlot | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])

  useEffect(() => {
    fetch('/api/admin/slots').then(r => r.ok ? r.json() : []).then(setSlots)
  }, [])

  const toWABusinessUrl = (waUrl: string): string => {
    const isAndroid = /Android/i.test(navigator.userAgent)
    if (isAndroid) {
      const params = waUrl.replace('whatsapp://send?', '')
      return `intent://send?${params}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`
    }
    const urlParams = new URLSearchParams(waUrl.replace('whatsapp://send?', ''))
    const phone = urlParams.get('phone') ?? ''
    const text = urlParams.get('text') ?? ''
    return `https://wa.me/${phone}?text=${encodeURIComponent(decodeURIComponent(text))}`
  }

  const sendViaWABusiness = (url: string) => window.open(toWABusinessUrl(url), '_blank')

  const grouped = groupBookings(bookings)

  // Counts for filter badges (based on grouped)
  const counts = {
    pending: grouped.filter(g => g.status === 'pending').length,
    confirmed: grouped.filter(g => g.status === 'confirmed' && !isGroupDone(g)).length,
    selesai: grouped.filter(g => g.status === 'confirmed' && isGroupDone(g)).length,
    cancelled: grouped.filter(g => g.status === 'cancelled').length,
  }

  // Default sort: newest created first. "Akan Main" → date asc + hour asc. "Selesai" → date desc + hour desc.
  const sortedGroups = [...grouped].sort((a, b) => {
    if (filter === 'confirmed') {
      const d = a.booking_date.localeCompare(b.booking_date)
      if (d !== 0) return d
      return a.start_hour - b.start_hour
    }
    if (filter === 'selesai') {
      const d = b.booking_date.localeCompare(a.booking_date)
      if (d !== 0) return d
      return b.start_hour - a.start_hour
    }
    return b.created_at.localeCompare(a.created_at)
  })
  const filtered = sortedGroups.filter(g => {
    if (filter === 'pending' && g.status !== 'pending') return false
    if (filter === 'confirmed' && (g.status !== 'confirmed' || isGroupDone(g))) return false
    if (filter === 'selesai' && (g.status !== 'confirmed' || !isGroupDone(g))) return false
    if (filter === 'cancelled' && g.status !== 'cancelled') return false
    if (search && !g.team_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Group by booking_date for "Akan Main" and "Selesai" tabs
  const todayStr = getJakartaToday()
  const groupedByDate: { date: string; groups: GroupedBooking[] }[] = []
  const isDateGrouped = filter === 'confirmed' || filter === 'selesai'
  if (isDateGrouped) {
    for (const g of filtered) {
      const last = groupedByDate[groupedByDate.length - 1]
      if (last && last.date === g.booking_date) {
        last.groups.push(g)
      } else {
        groupedByDate.push({ date: g.booking_date, groups: [g] })
      }
    }
  }

  const updateGroupStatus = async (group: GroupedBooking, status: 'confirmed' | 'cancelled') => {
    const bookingSnapshot = status === 'confirmed' ? group.primary : undefined
    const waUrl = bookingSnapshot ? buildConfirmUrl(bookingSnapshot) : null
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    const newWindow = (waUrl && !isMobile) ? window.open('', '_blank') : null
    setLoadingId(group.ids[0])
    const results = await Promise.all(
      group.ids.map(id =>
        fetch(`/api/admin/bookings/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
      )
    )
    if (results.every(r => r.ok)) {
      // First response carries the confirmer info from the API
      const firstData = await results[0].clone().json().catch(() => null) as
        | { confirmed_by_user?: { name: string } | null; confirmed_by?: string | null; confirmed_at?: string | null }
        | null
      const idSet = new Set(group.ids)
      setBookings(prev => prev.map(b => idSet.has(b.id) ? {
        ...b,
        status,
        confirmed_by: status === 'confirmed' ? (firstData?.confirmed_by ?? b.confirmed_by) : null,
        confirmed_at: status === 'confirmed' ? (firstData?.confirmed_at ?? b.confirmed_at) : null,
        confirmed_by_user: status === 'confirmed' ? (firstData?.confirmed_by_user ?? b.confirmed_by_user ?? null) : null,
      } : b))
      if (waUrl) {
        const businessUrl = toWABusinessUrl(waUrl)
        if (newWindow) {
          newWindow.location.href = businessUrl
        } else {
          window.open(businessUrl, '_blank')
        }
      } else {
        newWindow?.close()
      }
    } else {
      newWindow?.close()
    }
    setLoadingId(null)
  }

  const deleteGroup = async (group: GroupedBooking) => {
    if (!confirm('Hapus booking ini? Data akan dihapus permanen.')) return
    setDeletingId(group.ids[0])
    const results = await Promise.all(
      group.ids.map(id => fetch(`/api/admin/bookings/${id}`, { method: 'DELETE' }))
    )
    if (results.every(r => r.ok)) {
      const idSet = new Set(group.ids)
      setBookings(prev => prev.filter(b => !idSet.has(b.id)))
    }
    setDeletingId(null)
  }

  const renderTableRow = (group: GroupedBooking) => (
    <tr key={group.ids.join('-')} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
      <td className="px-4 py-3.5 text-sm text-slate-300">{formatDateShort(group.booking_date)}</td>
      <td className="px-4 py-3.5 text-sm text-slate-300 whitespace-nowrap">
        {formatHour(group.start_hour)}–{formatHour(group.end_hour)}
        {group.ids.length > 1 && (
          <span className="ml-1.5 text-[10px] text-slate-500">({group.end_hour - group.start_hour} jam)</span>
        )}
      </td>
      <td className="px-4 py-3.5 text-sm font-semibold text-slate-100">
        {group.team_name}
        {group.status === 'confirmed' && group.confirmed_by_name && (
          <div className="flex items-center gap-1 mt-0.5 text-[10px] font-normal text-slate-500">
            <Shield size={10} className="flex-shrink-0" />
            <span>oleh {group.confirmed_by_name}</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3.5">
        <EditablePhone
          bookingId={group.primary.id}
          phone={group.phone}
          onSaved={(id, ph) => {
            const idSet = new Set(group.ids)
            setBookings(prev => prev.map(b => idSet.has(b.id) ? { ...b, phone: ph || null } : b))
          }}
        />
      </td>
      <td className="px-4 py-3.5 text-sm font-bold text-green-400">
        {formatPrice(group.total_price)}
      </td>
      <td className="px-4 py-3.5"><StatusBadge status={group.status} done={isGroupDone(group)} /></td>
      <td className="px-4 py-3.5">
        <div className="flex gap-1.5 items-center">
          {group.status !== 'cancelled' && (
            <button
              onClick={() => setEditingBooking(group.primary)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
              title="Edit booking"
            >
              <Pencil size={14} />
            </button>
          )}
          {group.status === 'pending' && (
            <button
              onClick={() => updateGroupStatus(group, 'confirmed')}
              disabled={loadingId === group.ids[0]}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-green-500/15 ring-1 ring-green-500/30 text-green-400 hover:bg-green-500/25 disabled:opacity-40 transition-colors"
            >
              <Check size={13} /> Confirm
            </button>
          )}
          {group.status !== 'cancelled' && !isGroupDone(group) && (
            <button
              onClick={() => updateGroupStatus(group, 'cancelled')}
              disabled={loadingId === group.ids[0]}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-red-500/10 ring-1 ring-red-500/25 text-red-400 hover:bg-red-500/20 disabled:opacity-40 transition-colors"
            >
              <Ban size={13} /> Cancel
            </button>
          )}
          {group.status === 'cancelled' && (
            <button
              onClick={() => deleteGroup(group)}
              disabled={deletingId === group.ids[0]}
              className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
              title="Hapus permanen"
            >
              {deletingId === group.ids[0] ? '...' : <Trash2 size={15} />}
            </button>
          )}
          {isGroupDone(group) && buildFollowUpUrl(group) && (
            <button
              onClick={() => sendViaWABusiness(buildFollowUpUrl(group)!)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-blue-500/15 ring-1 ring-blue-500/30 text-blue-400 hover:bg-blue-500/25 transition-colors"
            >
              <MessageCircle size={13} /> Follow-up
            </button>
          )}
        </div>
      </td>
    </tr>
  )

  const renderMobileCard = (group: GroupedBooking) => (
    <div key={group.ids.join('-')} className="px-4 py-4 space-y-3">
      {/* Header: team name + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-slate-100 truncate">{group.team_name}</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
            <CalendarDays size={13} className="flex-shrink-0 text-slate-500" />
            <span>{formatDateShort(group.booking_date)}</span>
            <span className="text-slate-600">·</span>
            <span>
              {formatHour(group.start_hour)}–{formatHour(group.end_hour)}
              {group.ids.length > 1 && ` (${group.end_hour - group.start_hour} jam)`}
            </span>
          </div>
          <div className="mt-0.5">
            <EditablePhone
              bookingId={group.primary.id}
              phone={group.phone}
              onSaved={(id, ph) => {
                const idSet = new Set(group.ids)
                setBookings(prev => prev.map(b => idSet.has(b.id) ? { ...b, phone: ph || null } : b))
              }}
            />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <StatusBadge status={group.status} done={isGroupDone(group)} />
          <span className="text-sm font-bold text-green-400">
            {formatPrice(group.total_price)}
          </span>
          {group.status === 'confirmed' && group.confirmed_by_name && (
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <Shield size={10} className="flex-shrink-0" />
              <span className="text-slate-400">{group.confirmed_by_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {group.status !== 'cancelled' && !isGroupDone(group) && (
        <div className="flex gap-2">
          <button
            onClick={() => setEditingBooking(group.primary)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[13px] font-bold bg-slate-800/50 ring-1 ring-slate-700/50 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <Pencil size={14} />
          </button>
          {group.status === 'pending' && (
            <button
              onClick={() => updateGroupStatus(group, 'confirmed')}
              disabled={loadingId === group.ids[0]}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold bg-green-500/15 ring-1 ring-green-500/30 text-green-400 hover:bg-green-500/25 active:bg-green-500/30 disabled:opacity-40 transition-colors"
            >
              <Check size={15} /> Confirm
            </button>
          )}
          <button
            onClick={() => updateGroupStatus(group, 'cancelled')}
            disabled={loadingId === group.ids[0]}
            className={`${group.status === 'pending' ? 'flex-1' : 'w-full'} flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold bg-red-500/10 ring-1 ring-red-500/25 text-red-400 hover:bg-red-500/20 active:bg-red-500/25 disabled:opacity-40 transition-colors`}
          >
            <Ban size={15} /> Cancel
          </button>
        </div>
      )}

      {group.status === 'cancelled' && (
        <button
          onClick={() => deleteGroup(group)}
          disabled={deletingId === group.ids[0]}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-[13px] font-bold text-slate-400 bg-slate-800/30 ring-1 ring-slate-700/50 hover:text-red-400 hover:ring-red-500/30 disabled:opacity-40 transition-colors"
        >
          <Trash2 size={15} />
          {deletingId === group.ids[0] ? 'Menghapus...' : 'Hapus Permanen'}
        </button>
      )}

      {isGroupDone(group) && buildFollowUpUrl(group) && (
        <button
          onClick={() => sendViaWABusiness(buildFollowUpUrl(group)!)}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-[13px] font-bold bg-blue-500/15 ring-1 ring-blue-500/30 text-blue-400 hover:bg-blue-500/25 active:bg-blue-500/30 transition-colors"
        >
          <MessageCircle size={15} /> Follow-up WA
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-3">
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          slots={slots}
          onClose={() => setEditingBooking(null)}
          onSaved={(updated) => setBookings(prev => prev.map(b => b.id === updated.id ? updated : b))}
        />
      )}

      {/* ── Summary stats ── */}
      {counts.pending > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <CalendarDays size={20} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-yellow-300">{counts.pending} booking menunggu konfirmasi</p>
            <p className="text-xs text-yellow-400/70">Segera proses booking pending</p>
          </div>
        </div>
      )}

      {/* ── Search ── */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama tim..."
          className="w-full bg-slate-900/50 border border-slate-800/80 rounded-2xl pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-500 hover:text-slate-300"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Filter pills ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mb-0.5">
        {(['pending', 'confirmed', 'selesai', 'cancelled'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === f
                ? filterConfig[f].activeColor + ' shadow-sm'
                : 'bg-slate-900/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {filterConfig[f].label}
            {counts[f] > 0 && (
              <span className={`text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full ${
                filter === f ? 'bg-black/15' : 'bg-slate-800/80'
              }`}>
                {counts[f]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Booking list ── */}
      {isDateGrouped ? (
        filtered.length === 0 ? (
          <div className="bg-slate-900/50 backdrop-blur rounded-2xl border border-slate-800/80 px-4 py-16 text-center">
            <p className="text-sm text-slate-500">Tidak ada booking</p>
            <p className="text-xs text-slate-600 mt-1">Coba ubah filter atau kata kunci pencarian</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByDate.map(section => (
              <div
                key={section.date}
                className="bg-slate-900/50 backdrop-blur rounded-2xl border border-slate-800/80 overflow-hidden"
              >
                {/* Date header */}
                <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                  {formatDayHeader(section.date, todayStr)}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800/80">
                        {['Tanggal', 'Jam', 'Nama Tim', 'WA', 'Harga', 'Status', 'Aksi'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.groups.map(group => renderTableRow(group))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile card list */}
                <div className="md:hidden divide-y divide-slate-800/30">
                  {section.groups.map(group => renderMobileCard(group))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="bg-slate-900/50 backdrop-blur rounded-2xl border border-slate-800/80 overflow-hidden">
          {/* ── Desktop table ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/80">
                  {['Tanggal', 'Jam', 'Nama Tim', 'WA', 'Harga', 'Status', 'Aksi'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <p className="text-sm text-slate-500">Tidak ada booking</p>
                      <p className="text-xs text-slate-600 mt-1">Coba ubah filter atau kata kunci pencarian</p>
                    </td>
                  </tr>
                )}
                {filtered.map(group => renderTableRow(group))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile card list ── */}
          <div className="md:hidden">
            {filtered.length === 0 && (
              <div className="px-4 py-16 text-center">
                <p className="text-sm text-slate-500">Tidak ada booking</p>
                <p className="text-xs text-slate-600 mt-1">Coba ubah filter atau kata kunci</p>
              </div>
            )}
            <div className="divide-y divide-slate-800/30">
              {filtered.map(group => renderMobileCard(group))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
