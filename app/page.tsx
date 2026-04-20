import { CctvBackground } from '@/components/home/cctv-background'
import { CctvOverlay } from '@/components/home/cctv-overlay'
import { BusinessMenu } from '@/components/home/business-menu'
import { HeroNav } from '@/components/home/hero-nav'
import { LocationMap } from '@/components/home/location-map'

const cctvMode = process.env.NEXT_PUBLIC_CCTV_MODE === 'youtube' ? 'youtube' : 'video'
const youtubeChannelId = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950">
      {/* ── Hero ── */}
      <section className="relative h-screen min-h-[560px] w-full overflow-hidden">
        {/* Layer 0: CCTV video/iframe */}
        <CctvBackground
          mode={cctvMode}
          videoSrc="/hero-loop.mp4"
          poster="/hero-poster.jpg"
          youtubeChannelId={youtubeChannelId}
        />

        {/* Layer 1: Dark gradient (bottom fades into slate-950) */}
        <div
          aria-hidden
          className="absolute inset-0 z-10 bg-gradient-to-b from-slate-950/60 via-slate-950/20 to-slate-950"
        />

        {/* Layer 2: CCTV overlay badges */}
        <CctvOverlay mode={cctvMode} />

        {/* Layer 3: Nav */}
        <HeroNav />

        {/* Layer 4: Title + business menu */}
        <div className="relative z-20 h-full flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center pt-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-white drop-shadow-lg">
              Zains Mini Soccer
            </h1>
            <p className="text-slate-300/80 max-w-sm mt-3 text-[15px] drop-shadow">
              Booking lapangan, sewa PlayStation, dan design studio — satu lokasi.
            </p>
          </div>
          <div className="pb-8 sm:pb-12">
            <BusinessMenu />
          </div>
        </div>
      </section>

      {/* ── Location map (hidden if NEXT_PUBLIC_MAP_EMBED_URL not set) ── */}
      <LocationMap />
    </main>
  )
}
