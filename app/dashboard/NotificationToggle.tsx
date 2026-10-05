'use client'

import { useState } from 'react'
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
    <div className="card">
      <p className="mb-3 font-semibold">Notifikasi zona</p>
      <button onClick={handleToggle} className={enabled ? 'btn-primary' : 'btn-outline'}>
        {enabled ? 'ON' : 'OFF'}
      </button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  )
}
