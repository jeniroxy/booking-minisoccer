'use client'

import { useState } from 'react'
import { ChangePassword } from './ChangePassword'
import { UserManagement } from './UserManagement'
import { NotificationSettings } from './NotificationSettings'
import type { AdminRole } from '@/lib/rbac'

const ALL_TABS = [
  { key: 'users', label: 'Kelola User' },
  { key: 'password', label: 'Password' },
  { key: 'notifications', label: 'Notifikasi' },
] as const

type TabKey = (typeof ALL_TABS)[number]['key']

export function SettingsTabs({ role }: { role: AdminRole }) {
  const tabs = ALL_TABS.filter(t => t.key !== 'users' || role === 'admin')
  const [active, setActive] = useState<TabKey>(role === 'admin' ? 'users' : 'password')

  return (
    <>
      <div className="flex bg-slate-800 rounded-2xl p-[3px] mb-4 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`flex-1 px-3 py-2 rounded-xl text-[12px] font-bold transition-colors whitespace-nowrap ${
              active === tab.key
                ? 'bg-green-500/15 text-green-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'password' && <ChangePassword />}
      {active === 'users' && role === 'admin' && <UserManagement />}
      {active === 'notifications' && <NotificationSettings />}
    </>
  )
}
