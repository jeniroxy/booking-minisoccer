// Server-side helper to detect whether a YouTube video id is currently live.
// Uses the YouTube Data API v3. Returns false on any error / missing key so the
// homepage always falls back safely to the looping background video.

const LIVE_STATUS_TTL_SECONDS = 60

export async function checkLiveStatus(videoId: string): Promise<boolean> {
  const key = process.env.YOUTUBE_API_KEY
  if (!key || !videoId) return false

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}&key=${key}`
    const res = await fetch(url, { next: { revalidate: LIVE_STATUS_TTL_SECONDS } })
    if (!res.ok) return false

    const data = await res.json()
    const item = data?.items?.[0]
    // 'live' = currently streaming; 'upcoming'/'none' = not live.
    return item?.snippet?.liveBroadcastContent === 'live'
  } catch {
    return false
  }
}
