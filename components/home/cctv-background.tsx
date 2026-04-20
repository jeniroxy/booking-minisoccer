'use client'

type Props = {
  youtubeVideoId?: string
  youtubeChannelId?: string // YouTube Live mode (Fase 2)
}

const iframeStyle: React.CSSProperties = {
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
}

export function CctvBackground({ youtubeVideoId, youtubeChannelId }: Props) {
  if (youtubeVideoId) {
    const src = `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&mute=1&loop=1&controls=0&playlist=${youtubeVideoId}&modestbranding=1&playsinline=1&rel=0&disablekb=1`
    return (
      <div className="absolute inset-0 overflow-hidden">
        <iframe src={src} allow="autoplay; encrypted-media" aria-hidden="true" title="Background Video" style={iframeStyle} />
      </div>
    )
  }

  if (youtubeChannelId) {
    const src = `https://www.youtube.com/embed/live_stream?channel=${youtubeChannelId}&autoplay=1&mute=1&controls=0&modestbranding=1&playsinline=1`
    return (
      <div className="absolute inset-0 overflow-hidden">
        <iframe src={src} allow="autoplay; encrypted-media" aria-hidden="true" title="Live CCTV Feed" style={iframeStyle} />
      </div>
    )
  }

  return null
}
