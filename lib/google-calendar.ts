import { google } from 'googleapis'

function getCalendar() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  })

  return google.calendar({ version: 'v3', auth })
}

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID!

export async function createCalendarEvent(params: {
  bookingId: string
  teamName: string
  date: string       // 'YYYY-MM-DD'
  startHour: number
  endHour: number
  status: string
}): Promise<string | null> {
  try {
    const calendar = getCalendar()

    const startDateTime = `${params.date}T${String(params.startHour).padStart(2, '0')}:00:00+07:00`
    const endDateTime = `${params.date}T${String(params.endHour).padStart(2, '0')}:00:00+07:00`

    const statusLabel = params.status === 'confirmed' ? '✅' : '⏳'

    const res = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `${statusLabel} ${params.teamName}`,
        description: `Booking ID: ${params.bookingId}\nStatus: ${params.status}`,
        start: { dateTime: startDateTime, timeZone: 'Asia/Jakarta' },
        end: { dateTime: endDateTime, timeZone: 'Asia/Jakarta' },
        colorId: params.status === 'confirmed' ? '10' : '5',  // green : yellow
      },
    })

    return res.data.id ?? null
  } catch (e) {
    console.error('Google Calendar create error:', e)
    return null
  }
}

export async function updateCalendarEvent(eventId: string, params: {
  teamName: string
  status: string
}): Promise<void> {
  try {
    const calendar = getCalendar()
    const statusLabel = params.status === 'confirmed' ? '✅' : params.status === 'cancelled' ? '❌' : '⏳'

    await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId,
      requestBody: {
        summary: `${statusLabel} ${params.teamName}`,
        description: `Status: ${params.status}`,
        colorId: params.status === 'confirmed' ? '10' : params.status === 'cancelled' ? '11' : '5',
      },
    })
  } catch (e) {
    console.error('Google Calendar update error:', e)
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  try {
    const calendar = getCalendar()
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId,
    })
  } catch (e) {
    console.error('Google Calendar delete error:', e)
  }
}
