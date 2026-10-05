'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import StatusCard from './StatusCard'
import ZonesCard from './ZonesCard'
import DeviceCard from './DeviceCard'
import MapCard from './MapCard'
import NotificationToggle from './NotificationToggle'
import UnpairButton from './UnpairButton'
import ThemePicker from './ThemePicker'

export default function DashboardPage() {
  const [name, setName] = useState('')
  const [partnerId, setPartnerId] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [sharingEnabled, setSharingEnabled] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [locError, setLocError] = useState('')
  const watchIdRef = useRef<number | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name, location_sharing_enabled, partner_id, notifications_enabled')
        .eq('id', user.id)
        .single()

      if (!profile?.partner_id) {
        router.push('/pairing')
        return
      }

      setName(profile.name)
      setSharingEnabled(profile.location_sharing_enabled)
      setNotificationsEnabled(profile.notifications_enabled)
      setPartnerId(profile.partner_id)

      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', profile.partner_id)
        .single()

      if (partnerProfile) setPartnerName(partnerProfile.name)

      setLoading(false)
    }
    loadProfile()

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [router])

  useEffect(() => {
    if (sharingEnabled) {
      startWatching()
    } else {
      stopWatching()
    }
  }, [sharingEnabled])

  function startWatching() {
    if (!navigator.geolocation) {
      setLocError('Browser tidak mendukung geolocation')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        await supabase.from('locations').upsert(
          {
            user_id: user.id,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            is_online: true,
            speed_kmh: position.coords.speed != null && position.coords.speed >= 0 ? position.coords.speed * 3.6 : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        )
      },
      (err) => {
        setLocError('Gagal mengakses lokasi: ' + err.message)
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    )
  }

  function stopWatching() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  async function toggleSharing() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const newValue = !sharingEnabled
    await supabase
      .from('profiles')
      .update({ location_sharing_enabled: newValue })
      .eq('id', user.id)

    setSharingEnabled(newValue)
    setLocError('')
  }

  async function handleLogout() {
    stopWatching()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Memuat...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Halo,</p>
          <h1 className="text-2xl font-bold">{name}</h1>
        </div>
        <ThemePicker />
      </div>

      <a href="/profile" className="accent-chip inline-block">Ubah foto profil</a>

      <MapCard partnerId={partnerId} partnerName={partnerName} />

      <StatusCard partnerId={partnerId} partnerName={partnerName} />
      <ZonesCard partnerId={partnerId} partnerName={partnerName} sharingEnabled={sharingEnabled} notificationsEnabled={notificationsEnabled} />
      <DeviceCard partnerId={partnerId} partnerName={partnerName} sharingEnabled={sharingEnabled} />

      <div className="card">
        <p className="mb-3 font-semibold">Share lokasi ke dia</p>
        <button
          onClick={toggleSharing}
          className={sharingEnabled ? 'btn-primary' : 'btn-outline'}
        >
          {sharingEnabled ? 'ON' : 'OFF'}
        </button>
        {locError && <p className="mt-2 text-sm text-red-500">{locError}</p>}
      </div>

      <NotificationToggle enabled={notificationsEnabled} onChange={setNotificationsEnabled} />

      <UnpairButton />

      <button onClick={handleLogout} className="btn-outline w-full">
        Logout
      </button>
    </div>
  )
}
