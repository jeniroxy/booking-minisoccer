import { NextResponse } from 'next/server'
import { checkLiveStatus } from '@/lib/youtube-live'

const LIVE_VIDEO_ID = process.env.NEXT_PUBLIC_YOUTUBE_LIVE_VIDEO_ID ?? 'SqcsbvqeQ1U'

// Revalidate the YouTube check at most once per minute. The Cache-Control header
// lets the Vercel CDN serve the same result to all visitors, so many clients
// polling every 60s still cost ~1 YouTube API call per minute.
export const revalidate = 60

export async function GET() {
  const live = await checkLiveStatus(LIVE_VIDEO_ID)
  return NextResponse.json(
    { live },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' } },
  )
}
