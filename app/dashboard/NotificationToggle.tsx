'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function NotificationToggle({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (v: boolean) => void
}) {
  const [error, setError] = useState('')

  async function handleToggle() {
    setError('')

    if (!enabled) {
      if (!('Notification' in window)) {
        setError('Browser kamu tidak mendukung notifikasi')
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('Izin notifikasi ditolak. Aktifkan lewat setelan browser kalau mau coba lagi.')
        return
      }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newValue = !enabled
    await supabase
      .from('profiles')
      .update({ notifications_enabled: newValue })
      .eq('id', user.id)

    onChange(newValue)
  }

  return (
    <div className="rounded border p-4">
      <p className="mb-2">Notifikasi zona</p>
      <button
        onClick={handleToggle}
        className={`rounded p-2 px-4 text-white ${enabled ? 'bg-green-600' : 'bg-gray-400'}`}
      >
        {enabled ? 'ON' : 'OFF'}
      </button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  )
}
