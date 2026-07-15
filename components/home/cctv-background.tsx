'use client'

import { useEffect, useRef } from 'react'

type Props = {
  videoId: string
  isLive: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YTPlayer = any

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT?: any
    onYouTubeIframeAPIReady?: () => void
  }
}

// Cover-fit the player over the hero, non-interactive (no click, no controls).
const coverStyle: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '100vw',
  height: '56.25vw',
  minHeight: '100vh',
  minWidth: '177.78vh',
  transform: 'translate(-50%, -50%)',
  pointerEvents: 'none',
}

// Load the YouTube IFrame API once and resolve when YT.Player is ready.
let apiPromise: Promise<void> | null = null
function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve()
  if (apiPromise) return apiPromise

  apiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(tag)
  })
  return apiPromise
}

export function CctvBackground({ videoId, isLive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!videoId || !container) return

    let destroyed = false
    let player: YTPlayer = null

    loadYouTubeApi().then(() => {
      if (destroyed || !container || !window.YT) return

      // YT replaces this host node with the iframe; keep it out of React's tree.
      const host = document.createElement('div')
      host.style.width = '100%'
      host.style.height = '100%'
      container.appendChild(host)

      const playerVars: Record<string, unknown> = {
        autoplay: 1,
        mute: 1,
        controls: 0,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
      }
      // Loop the fallback clip; a live stream plays straight through.
      if (!isLive) {
        playerVars.loop = 1
        playerVars.playlist = videoId
      }

      player = new window.YT.Player(host, {
        width: '100%',
        height: '100%',
        videoId,
        playerVars,
        events: {
          onReady: (e: { target: YTPlayer }) => {
            e.target.mute()
            e.target.playVideo()
          },
          onStateChange: (e: { data: number; target: YTPlayer }) => {
            // Restart the fallback clip if it ever ends.
            if (!isLive && e.data === window.YT.PlayerState.ENDED) {
              e.target.playVideo()
            }
          },
        },
      })
    })

    return () => {
      destroyed = true
      try {
        player?.destroy()
      } catch {
        /* ignore */
      }
      container.innerHTML = ''
    }
  }, [videoId, isLive])

  if (!videoId) return null

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div ref={containerRef} style={coverStyle} aria-hidden="true" />
    </div>
  )
}
