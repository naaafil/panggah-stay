'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabaseClient'
import 'leaflet/dist/leaflet.css'

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false })

type Point = { lat: number; lng: number }

export default function MapCard({
  partnerId,
  partnerName,
}: {
  partnerId: string
  partnerName: string
}) {
  const [myLoc, setMyLoc] = useState<Point | null>(null)
  const [partnerLoc, setPartnerLoc] = useState<Point | null>(null)
  const [myAvatar, setMyAvatar] = useState('')
  const [partnerAvatar, setPartnerAvatar] = useState('')
  const [myName, setMyName] = useState('Kamu')
  const [leaflet, setLeaflet] = useState<any>(null)

  useEffect(() => {
    import('leaflet').then((L) => setLeaflet(L))
  }, [])

  useEffect(() => {
    async function loadInitial() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: mine } = await supabase
        .from('locations')
        .select('lat, lng')
        .eq('user_id', user.id)
        .maybeSingle()
      if (mine) setMyLoc(mine)

      const { data: partner } = await supabase
        .from('locations')
        .select('lat, lng')
        .eq('user_id', partnerId)
        .maybeSingle()
      if (partner) setPartnerLoc(partner)

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('avatar_url, name')
        .eq('id', user.id)
        .single()
      if (myProfile?.avatar_url) setMyAvatar(myProfile.avatar_url)
      if (myProfile?.name) setMyName(myProfile.name)

      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', partnerId)
        .single()
      if (partnerProfile?.avatar_url) setPartnerAvatar(partnerProfile.avatar_url)
    }
    loadInitial()

    const channel = supabase
      .channel('map-locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations' },
        async (payload) => {
          const row = payload.new as { user_id: string; lat: number; lng: number }
          const { data: { user } } = await supabase.auth.getUser()
          if (row.user_id === user?.id) setMyLoc({ lat: row.lat, lng: row.lng })
          if (row.user_id === partnerId) setPartnerLoc({ lat: row.lat, lng: row.lng })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [partnerId])

  function makeIcon(avatarUrl: string, color: string, label: string) {
    const inner = avatarUrl
      ? `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`
      : `<div style="width:100%;height:100%;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:16px">${label}</div>`

    return leaflet.divIcon({
      className: '',
      html: `<div style="width:44px;height:44px;border-radius:50%;border:3px solid ${color};background:white;box-shadow:0 2px 6px rgba(0,0,0,0.5);overflow:hidden">${inner}</div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    })
  }

  const center = myLoc ?? partnerLoc

  if (!center || !leaflet) {
    return (
      <div className="rounded border p-4">
        <p className="text-sm text-gray-500">Menunggu data lokasi...</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded border">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={16}
        style={{ height: '300px', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {myLoc && (
          <Marker
            position={[myLoc.lat, myLoc.lng]}
            icon={makeIcon(myAvatar, '#2563eb', (myName[0] || 'K').toUpperCase())}
          >
            <Popup>Kamu</Popup>
          </Marker>
        )}
        {partnerLoc && (
          <Marker
            position={[partnerLoc.lat, partnerLoc.lng]}
            icon={makeIcon(partnerAvatar, '#dc2626', (partnerName[0] || 'P').toUpperCase())}
          >
            <Popup>{partnerName || 'Pasangan'}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  )
}
