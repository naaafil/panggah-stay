'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import ThemePicker from '../ThemePicker'
import NotificationToggle from '../NotificationToggle'
import UnpairButton from '../UnpairButton'

export default function SettingsPage() {
  const [avatarUrl, setAvatarUrl] = useState('')
  const [phone, setPhone] = useState('')
  const [partnerPhone, setPartnerPhone] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [savingPhone, setSavingPhone] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, phone_number, notifications_enabled, partner_id')
        .eq('id', user.id)
        .single()

      if (data?.avatar_url) setAvatarUrl(data.avatar_url)
      if (data?.phone_number) setPhone(data.phone_number)
      if (data?.notifications_enabled) setNotificationsEnabled(data.notifications_enabled)

      if (data?.partner_id) {
        const { data: partner } = await supabase
          .from('profiles')
          .select('phone_number')
          .eq('id', data.partner_id)
          .single()
        if (partner?.phone_number) setPartnerPhone(partner.phone_number)
      }
    }
    load()
  }, [router])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    if (file.size > 2 * 1024 * 1024) {
      setError('Ukuran foto maksimal 2 MB')
      return
    }

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setUploading(false)
      return
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const path = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = `${pub.publicUrl}?t=${Date.now()}`

    await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)

    setUploading(false)
    setAvatarUrl(url)
  }

  async function handleSavePhone(e: React.FormEvent) {
    e.preventDefault()
    setSavingPhone(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ phone_number: phone.trim() })
      .eq('id', user.id)

    setSavingPhone(false)
    if (updateError) setError(updateError.message)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const waLink = partnerPhone
    ? `https://wa.me/${partnerPhone.replace(/\D/g, '')}`
    : null

  return (
    <div className="mx-auto max-w-lg space-y-3 px-4 py-5">
      <h1 className="text-2xl font-bold">Profil</h1>

      <div className="card flex items-center gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Foto profil" className="h-20 w-20 rounded-full object-cover" style={{ border: '3px solid var(--accent)' }} />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full text-xs text-gray-500" style={{ border: '2px dashed var(--card-border)' }}>
            Belum ada foto
          </div>
        )}
        <div className="flex-1">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleUpload}
            disabled={uploading}
            className="w-full text-xs"
          />
          {uploading && <p className="mt-1 text-xs text-gray-500">Mengupload...</p>}
        </div>
      </div>

      <div className="card">
        <p className="mb-2 font-semibold">Warna tema</p>
        <ThemePicker />
      </div>

      <div className="card">
        <p className="mb-2 font-semibold">Nomor WhatsApp kamu</p>
        <form onSubmit={handleSavePhone} className="flex gap-2">
          <input
            type="tel"
            placeholder="628xxxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field"
          />
          <button type="submit" disabled={savingPhone} className="btn-primary shrink-0">
            {savingPhone ? '...' : 'Simpan'}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      </div>

      {waLink && (
        <a href={waLink} target="_blank" className="btn-primary block text-center" style={{ background: '#16a34a' }}>
          💬 Chat via WhatsApp
        </a>
      )}

      <NotificationToggle enabled={notificationsEnabled} onChange={setNotificationsEnabled} />

      <UnpairButton />

      <button onClick={handleLogout} className="btn-outline w-full">
        Logout
      </button>
    </div>
  )
}
