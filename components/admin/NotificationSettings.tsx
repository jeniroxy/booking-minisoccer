'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bell, BellOff, Smartphone, Trash2, Loader2, Info, CheckCircle2 } from 'lucide-react'

interface Subscription {
  id: string
  endpoint: string
  device_label: string | null
  created_at: string
}

interface Settings {
  enabled: boolean
  notify_new_booking: boolean
  notify_play_finished: boolean
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function getDeviceLabel() {
  const ua = navigator.userAgent
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua)) {
    // Try to extract device model
    const match = ua.match(/;\s*([^;)]+)\s+Build/)
    return match ? match[1].trim() : 'Android'
  }
  if (/Mac/.test(ua)) return 'Mac'
  if (/Windows/.test(ua)) return 'Windows'
  return 'Browser'
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    notify_new_booking: true,
    notify_play_finished: true,
  })
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [swSupported, setSwSupported] = useState(true)
  const [permissionState, setPermissionState] = useState<string>('default')
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/push/settings')
      if (!res.ok) return
      const data = await res.json()
      setSettings(data.settings)
      setSubscriptions(data.subscriptions)
    } finally {
      setLoading(false)
    }
  }, [])

  // Check if current browser already has an active push subscription
  const checkCurrentSubscription = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator)) return
      const registration = await navigator.serviceWorker.getRegistration('/sw.js')
      if (!registration) return
      const sub = await registration.pushManager.getSubscription()
      if (sub) {
        setCurrentEndpoint(sub.endpoint)
      }
    } catch {
      // Ignore errors
    }
  }, [])

  useEffect(() => {
    setSwSupported('serviceWorker' in navigator && 'PushManager' in window)
    if ('Notification' in window) {
      setPermissionState(Notification.permission)
    }
    fetchData()
    checkCurrentSubscription()
  }, [fetchData, checkCurrentSubscription])

  // Is the current device subscribed?
  const currentDeviceSub = currentEndpoint
    ? subscriptions.find(s => s.endpoint === currentEndpoint)
    : null
  const isCurrentDeviceActive = !!currentDeviceSub

  const handleSubscribe = async () => {
    setSubscribing(true)
    setError('')
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      setPermissionState(permission)
      if (permission !== 'granted') {
        setError('Izin notifikasi ditolak. Cek pengaturan browser.')
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      setCurrentEndpoint(subscription.endpoint)

      const json = subscription.toJSON()
      const res = await fetch('/api/admin/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          deviceLabel: getDeviceLabel(),
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'Gagal mendaftarkan perangkat')
        return
      }

      await fetchData()
    } catch (err) {
      console.error('Subscribe failed:', err)
      setError('Gagal mengaktifkan notifikasi. Coba lagi.')
    } finally {
      setSubscribing(false)
    }
  }

  const handleUnsubscribe = async () => {
    if (!currentDeviceSub) return
    setSubscribing(true)
    setError('')
    try {
      // Unsubscribe from browser
      const registration = await navigator.serviceWorker.getRegistration('/sw.js')
      if (registration) {
        const sub = await registration.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
      }
      // Delete from server
      await fetch(`/api/admin/push/subscribe/${currentDeviceSub.id}`, { method: 'DELETE' })
      setSubscriptions(prev => prev.filter(s => s.id !== currentDeviceSub.id))
      setCurrentEndpoint(null)
    } catch (err) {
      console.error('Unsubscribe failed:', err)
      setError('Gagal menonaktifkan notifikasi')
    } finally {
      setSubscribing(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await fetch(`/api/admin/push/subscribe/${id}`, { method: 'DELETE' })
      const deleted = subscriptions.find(s => s.id === id)
      if (deleted && deleted.endpoint === currentEndpoint) {
        // Also unsubscribe browser if it's current device
        const registration = await navigator.serviceWorker.getRegistration('/sw.js')
        if (registration) {
          const sub = await registration.pushManager.getSubscription()
          if (sub) await sub.unsubscribe()
        }
        setCurrentEndpoint(null)
      }
      setSubscriptions(prev => prev.filter(s => s.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggle = async (key: keyof Settings) => {
    const newValue = !settings[key]
    const updated = { ...settings, [key]: newValue }
    setSettings(updated)

    await fetch('/api/admin/push/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: newValue }),
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-slate-500" size={24} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Subscribe / Unsubscribe current device */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Bell size={16} className="text-green-400" />
          Notifikasi Push
        </h2>

        {!swSupported ? (
          <p className="text-sm text-slate-400">
            Browser ini tidak mendukung push notification.
          </p>
        ) : permissionState === 'denied' ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-sm text-red-400">
              Izin notifikasi diblokir. Buka pengaturan browser untuk mengaktifkan kembali.
            </p>
          </div>
        ) : isCurrentDeviceActive ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl">
              <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
              <span className="text-sm font-medium text-green-400">Notifikasi aktif di perangkat ini</span>
            </div>
            <button
              onClick={handleUnsubscribe}
              disabled={subscribing}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {subscribing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <BellOff size={16} />
              )}
              Nonaktifkan di Perangkat Ini
            </button>
          </div>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-500/15 hover:bg-green-500/25 text-green-400 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {subscribing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Smartphone size={16} />
            )}
            Aktifkan Notifikasi di Perangkat Ini
          </button>
        )}

        {error && (
          <p className="mt-2 text-sm text-red-400">{error}</p>
        )}

        {/* iOS notice */}
        <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
          <Info size={14} className="mt-0.5 shrink-0" />
          <p>
            Untuk iPhone/iPad, tambahkan website ini ke Home Screen terlebih dahulu
            (Safari → Share → Add to Home Screen), baru aktifkan notifikasi.
          </p>
        </div>
      </div>

      {/* Toggle settings */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">Jenis Notifikasi</h2>

        <div className="space-y-3">
          <ToggleRow
            label="Notifikasi Aktif"
            description="Master switch — matikan untuk hentikan semua notifikasi"
            checked={settings.enabled}
            onChange={() => handleToggle('enabled')}
          />
          <div className="border-t border-slate-800/50" />
          <ToggleRow
            label="Booking Baru"
            description="Notifikasi saat ada booking masuk"
            checked={settings.notify_new_booking}
            onChange={() => handleToggle('notify_new_booking')}
            disabled={!settings.enabled}
          />
          <ToggleRow
            label="Waktu Main Selesai"
            description="Notifikasi saat waktu main booking selesai"
            checked={settings.notify_play_finished}
            onChange={() => handleToggle('notify_play_finished')}
            disabled={!settings.enabled}
          />
        </div>
      </div>

      {/* Device list */}
      <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Smartphone size={16} className="text-blue-400" />
          Perangkat Terdaftar
        </h2>

        {subscriptions.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-slate-500">
            <BellOff size={28} className="mb-2" />
            <p className="text-sm">Belum ada perangkat terdaftar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {subscriptions.map(sub => {
              const isThis = sub.endpoint === currentEndpoint
              return (
                <div
                  key={sub.id}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 ${
                    isThis ? 'bg-green-500/10 ring-1 ring-green-500/20' : 'bg-slate-800/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-slate-200">
                        {sub.device_label || 'Unknown Device'}
                      </p>
                      {isThis && (
                        <span className="text-[10px] font-bold text-green-400 bg-green-500/15 px-1.5 py-0.5 rounded-md">
                          Perangkat ini
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(sub.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(sub.id)}
                    disabled={deletingId === sub.id}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-700/50 transition-colors disabled:opacity-50"
                    aria-label="Hapus perangkat"
                  >
                    {deletingId === sub.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <div className={`flex items-center justify-between ${disabled ? 'opacity-50' : ''}`}>
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-green-500' : 'bg-slate-700'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
