import { CctvFeed } from '@/components/home/cctv-feed'
import { BusinessMenu } from '@/components/home/business-menu'
import { LocationMap } from '@/components/home/location-map'
import { checkLiveStatus } from '@/lib/youtube-live'

// Live CCTV stream; falls back to this looping clip when the stream is off.
const liveVideoId = process.env.NEXT_PUBLIC_YOUTUBE_LIVE_VIDEO_ID ?? 'SqcsbvqeQ1U'
const fallbackVideoId = process.env.NEXT_PUBLIC_YOUTUBE_VIDEO_ID ?? 'rAlemnSpBRs'

export default async function HomePage() {
  // Resolve live state on the server so the first paint already shows the
  // correct background (cached ~60s). The client then keeps it in sync.
  const initialLive = await checkLiveStatus(liveVideoId)

  return (
    <main className="min-h-screen bg-slate-950">
      {/* ── Hero ── */}
      <section className="relative h-dvh min-h-[560px] w-full overflow-hidden">
        <CctvFeed
          liveVideoId={liveVideoId}
          fallbackVideoId={fallbackVideoId}
          initialLive={initialLive}
        />
        <div
          aria-hidden
          className="absolute inset-0 z-10 bg-gradient-to-b from-slate-950/60 via-slate-950/20 to-slate-950"
        />
        <div className="relative z-20 h-full flex flex-col">
          <div className="flex-1 flex items-center justify-center px-4">
            <img
              src="/logo-hero.svg"
              alt="Zains Mini Soccer"
              className="w-56 sm:w-72 md:w-80 drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)]"
            />
          </div>
          <div className="pb-8 sm:pb-10">
            <BusinessMenu />
          </div>
        </div>
      </section>

      {/* ── Location map (hidden if NEXT_PUBLIC_MAP_EMBED_URL not set) ── */}
      <LocationMap />
    </main>
  )
}
