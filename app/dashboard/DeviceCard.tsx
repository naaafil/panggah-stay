'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Device = { battery_level: number | null; last_seen: string | null }

const ONLINE_WINDOW_MS = 90000

export default function DeviceCard({
  partnerId,
  partnerName,
  sharingEnabled,
}: {
  partnerId: string
  partnerName: string
  sharingEnabled: boolean
}) {
  const [device, setDevice] = useState<Device | null>(null)
  const [now, setNow] = useState(Date.now())
  const [batteryOk, setBatteryOk] = useState(true)

  useEffect(() => {
    if (!partnerId) return

    async function load() {
      const { data } = await supabase
        .from('locations')
        .select('battery_level, last_seen')
        .eq('user_id', partnerId)
        .maybeSingle()

      setDevice(data ?? null)
    }
    load()

    const channel = supabase
      .channel('partner-device')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations', filter: `user_id=eq.${partnerId}` },
        (payload) => {
          const row = payload.new as Device
          setDevice({ battery_level: row.battery_level, last_seen: row.last_seen })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [partnerId])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!sharingEnabled) return
    let cancelled = false

    async function beat() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      let level: number | null = null
      try {
        const nav = navigator as Navigator & {
          getBattery?: () => Promise<{ level: number }>
        }
        if (nav.getBattery) {
          const b = await nav.getBattery()
          level = Math.round(b.level * 100)
        } else {
          setBatteryOk(false)
        }
      } catch {
        setBatteryOk(false)
      }

      await supabase
        .from('locations')
        .update({
          battery_level: level,
          last_seen: new Date().toISOString(),
          is_online: true,
        })
        .eq('user_id', user.id)
    }

    beat()
    const t = setInterval(beat, 30000)

    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [sharingEnabled])

  const lastSeenMs = device?.last_seen ? new Date(device.last_seen).getTime() : null
  const online = lastSeenMs !== null && now - lastSeenMs < ONLINE_WINDOW_MS

  return (
    <div className="card">
      <p className="mb-2 text-sm text-gray-500">Perangkat {partnerName || 'dia'}</p>

      {device ? (
        <div className="space-y-1 text-sm">
          <p className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: online ? '#22c55e' : '#9ca3af' }}
            />
            {online ? 'Online' : 'Offline'}
          </p>
          {lastSeenMs !== null && !online && (
            <p className="text-xs text-gray-500">
              Terakhir terlihat: {new Date(lastSeenMs).toLocaleString('id-ID')}
            </p>
          )}
          <p className={device.battery_level !== null && device.battery_level <= 20 ? 'text-red-500' : ''}>
            Baterai: {device.battery_level !== null ? `${device.battery_level}%` : 'tidak diketahui'}
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Dia belum membagikan lokasi</p>
      )}

      {sharingEnabled && !batteryOk && (
        <p className="mt-2 text-xs text-gray-500">
          Browser kamu nggak mendukung info baterai.
        </p>
      )}
    </div>
  )
}
