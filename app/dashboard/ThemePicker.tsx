'use client'

import { useEffect, useState } from 'react'

const COLORS = [
  { name: 'Pink', value: '#db2777', soft: '#fce7f3' },
  { name: 'Ungu', value: '#9333ea', soft: '#f3e8ff' },
  { name: 'Peach', value: '#ea580c', soft: '#ffedd5' },
  { name: 'Mint', value: '#0d9488', soft: '#d9f9f0' },
  { name: 'Biru Langit', value: '#2563eb', soft: '#e0edff' },
  { name: 'Kuning', value: '#ca8a04', soft: '#fef9c3' },
]

export default function ThemePicker() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('#db2777')

  useEffect(() => {
    const saved = localStorage.getItem('theme-accent')
    if (saved) setCurrent(saved)
  }, [])

  function applyColor(color: { value: string; soft: string }) {
    document.documentElement.style.setProperty('--accent', color.value)
    document.documentElement.style.setProperty('--accent-soft', color.soft)
    document.documentElement.style.setProperty('--background', color.soft)
    document.documentElement.style.setProperty('--card-border', color.value + '33')
    localStorage.setItem('theme-accent', color.value)
    localStorage.setItem('theme-accent-soft', color.soft)
    setCurrent(color.value)
    setOpen(false)
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow"
        aria-label="Pilih warna tema"
      >
        <div className="h-5 w-5 rounded-full" style={{ background: current }} />
      </button>

      {open && (
        <div className="card absolute right-0 top-12 z-50 w-60 shadow-lg">
          <p className="mb-3 text-sm font-semibold">Pilih warna tema</p>
          <div className="grid grid-cols-3 gap-3">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => applyColor(c)}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="h-9 w-9 rounded-full"
                  style={{
                    background: c.value,
                    boxShadow: current === c.value ? `0 0 0 2px white, 0 0 0 4px ${c.value}` : 'none',
                  }}
                />
                <span className="text-xs">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
