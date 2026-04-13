'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, Loader2 } from 'lucide-react'

interface ExportOption {
  key: string
  label: string
  period: 'month' | 'year' | 'all'
}

const DEFAULT_OPTIONS: ExportOption[] = [
  { key: 'month', label: 'Bulan Ini', period: 'month' },
  { key: 'year', label: 'Tahun Ini', period: 'year' },
  { key: 'all', label: 'Seluruhnya', period: 'all' },
]

interface ExportMenuProps {
  title: string
  endpoint: string
  fileBaseName: string
  options?: ExportOption[]
  className?: string
}

export function ExportMenu({
  title,
  endpoint,
  fileBaseName,
  options = DEFAULT_OPTIONS,
  className = '',
}: ExportMenuProps) {
  const [open, setOpen] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const handleExport = async (opt: ExportOption) => {
    setDownloading(opt.key)
    setError('')
    try {
      const res = await fetch(`${endpoint}?period=${opt.period}`)
      if (!res.ok) {
        setError('Gagal mengunduh')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileBaseName}-${opt.period}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setOpen(false)
    } catch {
      setError('Gagal mengunduh')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-colors"
      >
        <Download size={14} />
        Export
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[240px] bg-slate-900 border border-slate-700 rounded-2xl shadow-xl z-40 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-800">
            <p className="text-[11px] font-bold text-slate-300">{title}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Format: CSV (buka dengan Excel)</p>
          </div>
          <div className="py-1">
            {options.map(opt => (
              <button
                key={opt.key}
                onClick={() => handleExport(opt)}
                disabled={downloading !== null}
                className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-40"
              >
                <span>{opt.label}</span>
                {downloading === opt.key ? (
                  <Loader2 size={14} className="animate-spin text-green-400" />
                ) : (
                  <Download size={12} className="text-slate-500" />
                )}
              </button>
            ))}
          </div>
          {error && (
            <p className="px-4 py-2 text-[11px] text-red-400 border-t border-slate-800">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
