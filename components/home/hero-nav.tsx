export function HeroNav() {
  return (
    <nav className="absolute top-0 inset-x-0 z-30 px-4 py-4">
      <div className="max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-2xl px-3 py-2">
          <img src="/logo-icon.svg" alt="Logo" className="w-7 h-7 rounded-lg" />
          <span className="text-[13px] font-bold text-white">Zains Mini Soccer</span>
        </div>
      </div>
    </nav>
  )
}
