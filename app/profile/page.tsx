'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
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
        .select('avatar_url')
        .eq('id', user.id)
        .single()

      if (data?.avatar_url) setAvatarUrl(data.avatar_url)
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

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', user.id)

    setUploading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setAvatarUrl(url)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold">Foto Profil</h1>

        <div className="flex justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Foto profil"
              className="h-32 w-32 rounded-full border object-cover"
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-full border text-sm text-gray-500">
              Belum ada foto
            </div>
          )}
        </div>

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          disabled={uploading}
          className="w-full text-sm"
        />

        {uploading && <p className="text-sm text-gray-500">Mengupload...</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={() => router.push('/dashboard')}
          className="w-full rounded bg-black p-2 text-white"
        >
          Kembali ke dashboard
        </button>
      </div>
    </div>
  )
}
