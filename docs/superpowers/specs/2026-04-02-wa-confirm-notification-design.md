# WA Confirmation Notification on Admin Confirm

**Date:** 2026-04-02
**Status:** Approved

## Goal

When an admin clicks the "Confirm" button on a pending booking, the browser automatically opens WhatsApp pre-filled with a confirmation message to the customer's phone number. Admin just taps Send.

## Message Template

```
Tos di booking ya a, atas nama [Nama Tim] 🎉
📅 [Hari, Tgl Bln Tahun] · [HH:00–HH:00]
💰 [Rp xxx.xxx]
Di antos kasumpingana! ⚽
Toleransi waktu 15 menit, lebih dari 15 menit waktu akan langsung dimulai.
```

**Variable mapping:**
- `[Nama Tim]` → `booking.team_name`
- `[Hari, Tgl Bln Tahun]` → `booking.booking_date` formatted with `Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })`
- `[HH:00–HH:00]` → `booking.time_slots.start_hour` and `end_hour` zero-padded
- `[Rp xxx.xxx]` → `formatPrice(booking.total_price ?? booking.time_slots.price)` (existing helper)

## Architecture

**Approach:** Auto-open WA deep link on confirm success (same pattern as existing `buildFollowUpUrl`).

**Only 1 file changes:** `components/admin/BookingTable.tsx`

### New function: `buildConfirmUrl(booking: BookingWithSlot): string | null`

- Returns `null` if `booking.phone` is null/empty
- Strips non-digits from phone: `booking.phone.replace(/\D/g, '')`
- Builds message from template above
- Returns `whatsapp://send?phone={phone}&text={encodeURIComponent(message)}`

### Change to `updateStatus` function

After `res.ok` and `status === 'confirmed'`:
1. Find the booking in current state
2. Call `buildConfirmUrl(booking)`
3. If non-null: `window.open(url, '_blank')`

## Edge Cases

| Condition | Behaviour |
|---|---|
| `booking.phone` is null or empty | Skip WA silently — confirm still succeeds |
| Admin on mobile | `whatsapp://` opens WA app directly |
| Admin on desktop | Opens WA Web or WA Desktop |
| `time_slots` is null | Should not happen for valid bookings, but price falls back to `total_price` |

## Out of Scope

- WA Business API / programmatic sending (no extra admin action)
- Cancel notification
- Toast/modal UI after confirm
