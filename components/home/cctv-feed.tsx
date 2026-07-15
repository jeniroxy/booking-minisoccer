'use client'

import { useEffect, useState } from 'react'
import { CctvBackground } from './cctv-background'
import { CctvOverlay } from './cctv-overlay'

type Props = {
  liveVideoId: string
  fallbackVideoId: string
  initialLive: boolean
}

const POLL_INTERVAL_MS = 60_000

export function CctvFeed({ liveVideoId, fallbackVideoId, initialLive }: Props) {
  const [isLive, setIsLive] = useState(initialLive)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch('/api/live-status', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && typeof data.live === 'boolean') setIsLive(data.live)
      } catch {
        // Network hiccup — keep the last known state.
      }
    }

    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <>
      <CctvBackground videoId={isLive ? liveVideoId : fallbackVideoId} isLive={isLive} />
      <CctvOverlay mode={isLive ? 'youtube' : 'video'} />
    </>
  )
}
