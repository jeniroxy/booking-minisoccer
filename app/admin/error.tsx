'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 max-w-md w-full">
        <h2 className="text-red-400 font-bold text-lg mb-2">Error</h2>
        <p className="text-slate-300 text-sm mb-1">{error.message}</p>
        <pre className="text-[10px] text-slate-500 mt-2 overflow-auto max-h-40">{error.stack}</pre>
        <button
          onClick={reset}
          className="mt-4 px-4 py-2 bg-green-500 text-green-950 rounded-xl text-sm font-bold"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  )
}
