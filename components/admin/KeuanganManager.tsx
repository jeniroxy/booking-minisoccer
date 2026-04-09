'use client'

import { useState, useEffect } from 'react'
import { ReportTabs } from './ReportTabs'
import { InputPageTabs } from './InputPageTabs'
import { Plus, X } from 'lucide-react'

function InputModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-slate-800 border border-slate-700/50 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-100">Input Data</h2>
            <p className="text-xs text-slate-500 mt-0.5">Input pendapatan & pengeluaran</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-1 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-5">
          <InputPageTabs onSaved={onClose} />

          <button
            onClick={onClose}
            className="w-full mt-4 px-4 py-2.5 rounded-xl text-[13px] font-bold bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}

export function KeuanganManager() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      {modalOpen && <InputModal onClose={() => setModalOpen(false)} />}

      <div className="pb-20">
        <ReportTabs />
      </div>

      {/* FAB */}
      {!modalOpen && (
        <button
          onClick={() => setModalOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full bg-green-500 text-green-950 shadow-lg shadow-green-500/30 flex items-center justify-center hover:bg-green-400 active:scale-95 transition-all"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      )}
    </>
  )
}
