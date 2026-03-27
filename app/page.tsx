import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-screen-xl mx-auto">
          <span className="font-bold text-lg text-blue-500">⚽ MiniSoccer</span>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-lg">
          ⚽
        </div>
        <h1 className="text-4xl font-bold text-slate-800 mb-3">
          Booking Lapangan<br />Mini Soccer
        </h1>
        <p className="text-gray-500 max-w-sm mb-8 text-lg">
          Cek jadwal kosong dan booking lapangan dalam hitungan detik. Konfirmasi via WhatsApp.
        </p>
        <Link
          href="/jadwal"
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-full transition-colors text-base shadow-sm"
        >
          Lihat Jadwal
        </Link>
      </div>

      {/* Feature cards */}
      <div className="max-w-screen-md mx-auto w-full px-4 pb-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: '📅', title: 'Jadwal Real-time', desc: 'Lihat ketersediaan slot langsung.' },
          { icon: '📱', title: 'Booking via WA', desc: 'Konfirmasi mudah lewat WhatsApp.' },
          { icon: '✅', title: 'DP & Konfirmasi', desc: 'Admin proses DP dan konfirmasi cepat.' },
        ].map(card => (
          <div key={card.title} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="text-2xl mb-2">{card.icon}</div>
            <h3 className="font-semibold text-slate-800 mb-1">{card.title}</h3>
            <p className="text-sm text-gray-500">{card.desc}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
