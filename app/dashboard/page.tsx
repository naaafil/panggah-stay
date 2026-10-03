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
import { useState as useConfirmState } from 'react'

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

  if (loading) return <div className="p-4">Loading...</div>

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Halo, {name}</h1>
      <a href="/profile" className="text-sm underline">Ubah foto profil</a>
      <UnpairButton />
      <NotificationToggle enabled={notificationsEnabled} onChange={setNotificationsEnabled} />

      <MapCard partnerId={partnerId} partnerName={partnerName} />

      <StatusCard partnerId={partnerId} partnerName={partnerName} />
      <ZonesCard partnerId={partnerId} partnerName={partnerName} sharingEnabled={sharingEnabled} notificationsEnabled={notificationsEnabled} />
      <DeviceCard partnerId={partnerId} partnerName={partnerName} sharingEnabled={sharingEnabled} />

      <div className="rounded border p-4">
        <p className="mb-2">Share lokasi ke dia</p>
        <button
          onClick={toggleSharing}
          className={`rounded p-2 px-4 text-white ${sharingEnabled ? 'bg-green-600' : 'bg-gray-400'}`}
        >
          {sharingEnabled ? 'ON' : 'OFF'}
        </button>
        {locError && <p className="mt-2 text-sm text-red-500">{locError}</p>}
      </div>

      <button
        onClick={handleLogout}
        className="rounded bg-black p-2 text-white"
      >
        Logout
      </button>
    </div>
  )
}
