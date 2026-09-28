'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function UnpairButton() {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleUnpair() {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error: rpcError } = await supabase.rpc('unpair_partner', {
      my_id: user.id,
    })

    setLoading(false)

    if (rpcError || !data?.success) {
      setError(data?.error || 'Gagal memutuskan koneksi')
      return
    }

    router.push('/pairing')
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-sm text-red-500 underline"
      >
        Putuskan koneksi berpasangan
      </button>
    )
  }

  return (
    <div className="rounded border border-red-300 p-4">
      <p className="mb-2 text-sm">
        Yakin mau putuskan koneksi? Kamu dan dia bakal saling kehilangan akses lokasi, status, dan riwayat.
      </p>
      {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleUnpair}
          disabled={loading}
          className="rounded bg-red-600 p-2 px-4 text-sm text-white disabled:opacity-50"
        >
          {loading ? 'Memproses...' : 'Ya, putuskan'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded border p-2 px-4 text-sm"
        >
          Batal
        </button>
      </div>
    </div>
  )
}
