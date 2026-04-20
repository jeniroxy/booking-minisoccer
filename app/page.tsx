import { CctvBackground } from '@/components/home/cctv-background'
import { CctvOverlay } from '@/components/home/cctv-overlay'
import { BusinessMenu } from '@/components/home/business-menu'
import { LocationMap } from '@/components/home/location-map'

const youtubeVideoId = process.env.NEXT_PUBLIC_YOUTUBE_VIDEO_ID ?? 'rAlemnSpBRs'
const youtubeChannelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID // Fase 2: YouTube Live CCTV
const cctvMode = youtubeChannelId ? 'youtube' : 'video'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950">
      {/* ── Hero ── */}
      <section className="relative min-h-screen w-full">
        {/* Background video — fixed height cover, tidak ikut stretch */}
        <div className="absolute inset-0 overflow-hidden">
          <CctvBackground
            youtubeVideoId={youtubeChannelId ? undefined : youtubeVideoId}
            youtubeChannelId={youtubeChannelId}
          />
          {/* Dark gradient */}
          <div
            aria-hidden
            className="absolute inset-0 z-10 bg-gradient-to-b from-slate-950/60 via-slate-950/20 to-slate-950"
          />
        </div>

        {/* CCTV overlay badges */}
        <CctvOverlay mode={cctvMode} />

        {/* Content */}
        <div className="relative z-20 flex flex-col items-center min-h-screen">
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center py-20">
            <img
              src="/logo-hero.svg"
              alt="Zains Mini Soccer"
              className="w-56 sm:w-72 md:w-80 drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)]"
            />
          </div>
          <div className="w-full pb-10 sm:pb-14">
            <BusinessMenu />
          </div>
        </div>
      </section>

      {/* ── Location map (hidden if NEXT_PUBLIC_MAP_EMBED_URL not set) ── */}
      <LocationMap />
    </main>
  )
}
