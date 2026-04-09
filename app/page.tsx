import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      <nav className="bg-slate-950 border-b border-slate-800 px-4 py-2.5 sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto flex items-center gap-2">
          <img src="/logo-icon.svg" alt="Logo" className="w-8 h-8 rounded-[10px]" />
          <p className="text-[14px] font-bold text-slate-100">Zains Mini Soccer</p>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-500/15 border border-green-500/30 rounded-2xl flex items-center justify-center mb-6">
          <img src="/logo-icon.svg" alt="Logo" className="w-12 h-12" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-3">
          Booking Lapangan<br />Mini Soccer
        </h1>
        <p className="text-slate-400 max-w-sm mb-8 text-[15px]">
          Cek jadwal kosong dan booking lapangan dalam hitungan detik. Konfirmasi via WhatsApp.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/jadwal"
            className="bg-green-500 hover:bg-green-400 text-green-950 font-bold px-8 py-3.5 rounded-2xl transition-colors text-[14px] shadow-[0_4px_24px_rgba(34,197,94,0.3)]"
          >
            Booking Lapangan
          </Link>
          <Link
            href="/ps"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-8 py-3.5 rounded-2xl transition-colors text-[14px] border border-slate-700"
          >
            🎮 PS Rental
          </Link>
        </div>
      </div>

      {/* Feature cards */}
      <div className="max-w-[1200px] mx-auto w-full px-4 pb-16 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: '📅', title: 'Jadwal Real-time', desc: 'Lihat ketersediaan slot langsung.' },
          { icon: '📱', title: 'Booking via WA', desc: 'Konfirmasi mudah lewat WhatsApp.' },
          { icon: '✅', title: 'DP & Konfirmasi', desc: 'Admin proses DP dan konfirmasi cepat.' },
        ].map(card => (
          <div key={card.title} className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50">
            <div className="text-2xl mb-2">{card.icon}</div>
            <h3 className="font-bold text-slate-100 text-[14px] mb-1">{card.title}</h3>
            <p className="text-[12px] text-slate-500">{card.desc}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
