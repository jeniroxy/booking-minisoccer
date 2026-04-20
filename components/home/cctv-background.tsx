'use client'

import { useEffect, useRef } from 'react'

type Props = {
  mode: 'video' | 'youtube'
  videoSrc: string
  poster: string
  youtubeChannelId?: string
}

export function CctvBackground({ mode, videoSrc, poster, youtubeChannelId }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches && videoRef.current) {
      videoRef.current.pause()
    }
  }, [])

  if (mode === 'youtube' && youtubeChannelId) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/live_stream?channel=${youtubeChannelId}&autoplay=1&mute=1&controls=0&modestbranding=1&playsinline=1`}
          allow="autoplay; encrypted-media"
          aria-hidden="true"
          title="Live CCTV Feed"
          style={{
            border: 0,
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '100vw',
            height: '56.25vw',
            minHeight: '100vh',
            minWidth: '177.78vh',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        />
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      src={videoSrc}
      poster={poster}
      muted
      playsInline
      autoPlay
      loop
      preload="metadata"
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover"
    />
  )
}
