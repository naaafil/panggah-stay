'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/dashboard', label: 'Beranda', icon: '🏠' },
  { href: '/dashboard/chat', label: 'Chat', icon: '💬' },
  { href: '/dashboard/settings', label: 'Profil', icon: '⚙️' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen pb-20">
      {children}

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-center border-t bg-white"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className="flex w-full max-w-lg">
          {TABS.map((tab) => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs"
                style={{ color: active ? 'var(--accent)' : '#9ca3af' }}
              >
                <span className="text-xl">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
