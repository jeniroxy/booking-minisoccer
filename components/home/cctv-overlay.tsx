'use client'

import { useEffect, useState } from 'react'

function formatTimestamp(d: Date) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss} WIB`
}

export function CctvOverlay({ mode }: { mode: 'video' | 'youtube' }) {
  const [timestamp, setTimestamp] = useState('')

  useEffect(() => {
    setTimestamp(formatTimestamp(new Date()))
    const id = setInterval(() => setTimestamp(formatTimestamp(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  const isLive = mode === 'youtube'

  return (
    <>
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 font-mono text-[11px] text-white/70 select-none">
        <span className={`w-2 h-2 rounded-full shrink-0 ${isLive ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`} />
        <span>{isLive ? 'LIVE' : 'REC'}</span>
        <span className="opacity-40">|</span>
        <span>CAM-01 / LAPANGAN</span>
      </div>
      <div className="absolute top-4 right-4 z-20 font-mono text-[11px] text-white/70 select-none tabular-nums">
        {timestamp}
      </div>
    </>
  )
}
