'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Zone = { id: string; name: string; lat: number; lng: number; radius_meters: number }
type ZoneEvent = { id: string; status_text: string; created_at: string }

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export default function ZonesCard({
  partnerId,
  partnerName,
  sharingEnabled,
  notificationsEnabled,
}: {
  partnerId: string
  partnerName: string
  sharingEnabled: boolean
  notificationsEnabled: boolean
}) {
  const [zones, setZones] = useState<Zone[]>([])
  const [name, setName] = useState('')
  const [radius, setRadius] = useState(100)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [currentZoneName, setCurrentZoneName] = useState('')
  const [partnerEvent, setPartnerEvent] = useState<ZoneEvent | null>(null)

  const zonesRef = useRef<Zone[]>([])
  const currentZoneRef = useRef<Zone | null>(null)
  const userIdRef = useRef('')
  const watchIdRef = useRef<number | null>(null)

  const loadZones = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    userIdRef.current = user.id

    const { data } = await supabase
      .from('zones')
      .select('id, name, lat, lng, radius_meters')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    const list = data ?? []
    setZones(list)
    zonesRef.current = list
  }, [])

  const loadPartnerEvent = useCallback(async () => {
    const { data } = await supabase
      .from('activity_log')
      .select('id, status_text, created_at')
      .eq('user_id', partnerId)
      .in('type', ['check_in', 'check_out'])
      .order('created_at', { ascending: false })
      .limit(1)

    const newest = data && data.length > 0 ? data[0] : null
    setPartnerEvent((prev) => {
      if (notificationsEnabled && newest && newest.id !== prev?.id && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(partnerName || 'Pasangan', { body: newest.status_text })
      }
      return newest
    })
  }, [partnerId])

  useEffect(() => {
    loadZones()
    loadPartnerEvent()

    const channel = supabase
      .channel('activity-zone')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_log' },
        () => {
          loadPartnerEvent()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadZones, loadPartnerEvent])

  async function logEvent(type: 'check_in' | 'check_out', zone: Zone) {
    await supabase.from('activity_log').insert({
      user_id: userIdRef.current,
      type,
      zone_id: zone.id,
      status_text: type === 'check_in' ? `Sampai di ${zone.name}` : `Keluar dari ${zone.name}`,
    })
  }

  async function handlePosition(lat: number, lng: number) {
    const inside =
      zonesRef.current.find(
        (z) => distanceMeters(lat, lng, z.lat, z.lng) <= z.radius_meters
      ) ?? null
    const prev = currentZoneRef.current

    if ((inside?.id ?? null) === (prev?.id ?? null)) return

    currentZoneRef.current = inside
    setCurrentZoneName(inside ? inside.name : '')

    if (prev) await logEvent('check_out', prev)
    if (inside) await logEvent('check_in', inside)
  }

  useEffect(() => {
    if (!sharingEnabled || !navigator.geolocation) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      currentZoneRef.current = null
      setCurrentZoneName('')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        handlePosition(pos.coords.latitude, pos.coords.longitude)
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [sharingEnabled])

  function handleAddZone(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) return
    if (!navigator.geolocation) {
      setError('Browser tidak mendukung geolocation')
      return
    }

    setSaving(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setSaving(false)
          return
        }

        const { error: insertError } = await supabase.from('zones').insert({
          user_id: user.id,
          name: name.trim(),
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          radius_meters: radius,
        })

        setSaving(false)

        if (insertError) {
          setError(insertError.message)
          return
        }

        setName('')
        loadZones()
      },
      (err) => {
        setSaving(false)
        setError('Gagal mengambil lokasi: ' + err.message)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleDelete(id: string) {
    if (currentZoneRef.current?.id === id) {
      currentZoneRef.current = null
      setCurrentZoneName('')
    }
    await supabase.from('zones').delete().eq('id', id)
    loadZones()
  }

  return (
    <div className="space-y-4">
      <div className="rounded border p-4">
        <p className="mb-2 font-semibold">Zona {partnerName || 'dia'}</p>
        {partnerEvent ? (
          <div className="text-sm">
            <p>{partnerEvent.status_text}</p>
            <p className="text-gray-500">
              {new Date(partnerEvent.created_at).toLocaleString('id-ID')}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Belum ada check-in</p>
        )}
      </div>

      <div className="rounded border p-4">
        <p className="mb-2 font-semibold">Zona kamu</p>
        <p className="mb-3 text-sm text-gray-500">
          {sharingEnabled
            ? currentZoneName
              ? `Kamu sekarang di: ${currentZoneName}`
              : 'Kamu lagi di luar zona'
            : 'Nyalain share lokasi biar check-in otomatis jalan'}
        </p>

        <form onSubmit={handleAddZone} className="space-y-2">
          <input
            type="text"
            placeholder="Nama zona (misal: Rumah)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            required
            className="w-full rounded border p-2"
          />
          <label className="block text-sm text-gray-500">
            Radius (meter)
            <input
              type="number"
              min={50}
              max={1000}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-black p-2 px-4 text-white disabled:opacity-50"
          >
            {saving ? 'Mengambil lokasi...' : 'Simpan lokasi sekarang sebagai zona'}
          </button>
        </form>

        {zones.length > 0 && (
          <div className="mt-4 space-y-2">
            {zones.map((z) => (
              <div key={z.id} className="flex items-center justify-between gap-2 text-sm">
                <p>
                  {z.name} <span className="text-gray-500">({z.radius_meters} m)</span>
                </p>
                <button
                  onClick={() => handleDelete(z.id)}
                  className="rounded border px-2 py-1 text-red-500"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
