'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function PairingPage() {
  const [myCode, setMyCode] = useState('')
  const [myId, setMyId] = useState('')
  const [partnerCode, setPartnerCode] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setMyId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('invite_code, partner_id')
        .eq('id', user.id)
        .single()

      if (profile) {
        setMyCode(profile.invite_code)
        if (profile.partner_id) {
          router.push('/dashboard')
        }
      }
    }
    loadProfile()
  }, [router])

  async function handlePair(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: rpcError } = await supabase.rpc('pair_with_code', {
      my_id: myId,
      code: partnerCode.trim(),
    })

    if (rpcError || !data.success) {
      setError(data?.error || 'Gagal melakukan pairing')
      setLoading(false)
      return
    }

    setPartnerName(data.partner_name)
    setTimeout(() => router.push('/dashboard'), 1000)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Hubungkan Akun</h1>
          <p className="mt-2 text-sm text-gray-500">Kode invite kamu:</p>
          <p className="mt-1 text-3xl font-mono font-bold tracking-widest">{myCode}</p>
          <p className="mt-1 text-xs text-gray-500">Kasih kode ini ke dia</p>
        </div>

        <form onSubmit={handlePair} className="space-y-4">
          <p className="text-sm text-gray-500">Atau masukkan kode berpasangan:</p>
          <input
            type="text"
            placeholder="Kode berpasangan"
            value={partnerCode}
            onChange={(e) => setPartnerCode(e.target.value)}
            required
            className="w-full rounded border p-2 uppercase"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
          {partnerName && <p className="text-sm text-green-600">Berhasil terhubung dengan {partnerName}!</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-black p-2 text-white disabled:opacity-50"
          >
            {loading ? 'Menghubungkan...' : 'Hubungkan'}
          </button>
        </form>
      </div>
    </div>
  )
}
