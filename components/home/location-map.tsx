import { MapPin } from 'lucide-react'

export function LocationMap() {
  const embedUrl = process.env.NEXT_PUBLIC_MAP_EMBED_URL
  const directionsUrl = process.env.NEXT_PUBLIC_MAP_DIRECTIONS_URL ?? '#'
  const address = process.env.NEXT_PUBLIC_VENUE_ADDRESS ?? ''

  if (!embedUrl) return null

  return (
    <section className="max-w-3xl mx-auto w-full px-4 py-14">
      <h2 className="text-xl font-bold text-slate-100 mb-1">Lokasi</h2>
      <p className="text-[13px] text-slate-500 mb-5">Semua layanan dalam satu tempat</p>

      <iframe
        src={embedUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        title="Lokasi Zains Mini Soccer"
        className="w-full aspect-video rounded-2xl border border-slate-800"
      />

      {(address || directionsUrl !== '#') && (
        <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {address && (
            <div className="flex items-start gap-2 text-slate-400">
              <MapPin size={15} className="mt-0.5 shrink-0 text-green-500" />
              <span className="text-[13px]">{address}</span>
            </div>
          )}
          {directionsUrl !== '#' && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[13px] font-medium px-4 py-2 rounded-xl border border-slate-700 transition-colors"
            >
              Buka di Google Maps
            </a>
          )}
        </div>
      )}
    </section>
  )
}
