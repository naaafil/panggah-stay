'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Entry = { id: string; status_text: string; created_at: string }

const PRESETS = ['Lagi di sekolah', 'Di jalan', 'Di rumah', 'Lagi makan', 'Mau tidur']

export default function StatusCard({
  partnerId,
  partnerName,
}: {
  partnerId: string
  partnerName: string
}) {
  const [text, setText] = useState('')
  const [myHistory, setMyHistory] = useState<Entry[]>([])
  const [partnerStatus, setPartnerStatus] = useState<Entry | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadMine = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('activity_log')
      .select('id, status_text, created_at')
      .eq('user_id', user.id)
      .eq('type', 'status_update')
      .order('created_at', { ascending: false })
      .limit(10)

    setMyHistory(data ?? [])
  }, [])

  const loadPartner = useCallback(async () => {
    const { data } = await supabase
      .from('activity_log')
      .select('id, status_text, created_at')
      .eq('user_id', partnerId)
      .eq('type', 'status_update')
      .order('created_at', { ascending: false })
      .limit(1)

    setPartnerStatus(data && data.length > 0 ? data[0] : null)
  }, [partnerId])

  useEffect(() => {
    loadMine()
    loadPartner()

    const channel = supabase
      .channel('activity-status')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_log' },
        () => {
          loadPartner()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadMine, loadPartner])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return

    setError('')
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: insertError } = await supabase.from('activity_log').insert({
      user_id: user.id,
      type: 'status_update',
      status_text: text.trim(),
    })

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setText('')
    loadMine()
  }

  async function handleDelete(id: string) {
    await supabase.from('activity_log').delete().eq('id', id)
    loadMine()
  }

  return (
    <div className="space-y-4">
      <div className="rounded border p-4">
        <p className="mb-2 font-semibold">Status {partnerName || 'dia'}</p>
        {partnerStatus ? (
          <div className="text-sm">
            <p>{partnerStatus.status_text}</p>
            <p className="text-gray-500">
              {new Date(partnerStatus.created_at).toLocaleString('id-ID')}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Belum ada status</p>
        )}
      </div>

      <div className="rounded border p-4">
        <p className="mb-2 font-semibold">Status kamu</p>

        <div className="mb-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setText(p)}
              className="rounded border px-2 py-1 text-sm"
            >
              {p}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            placeholder="Lagi ngapain?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={100}
            className="w-full rounded border p-2"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-black p-2 px-4 text-white disabled:opacity-50"
          >
            {saving ? 'Menyimpan...' : 'Update status'}
          </button>
        </form>

        {myHistory.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold">Riwayat statusmu</p>
            {myHistory.map((h) => (
              <div key={h.id} className="flex items-center justify-between gap-2 text-sm">
                <div>
                  <p>{h.status_text}</p>
                  <p className="text-gray-500">
                    {new Date(h.created_at).toLocaleString('id-ID')}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(h.id)}
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
