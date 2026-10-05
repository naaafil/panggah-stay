'use client'

import { useEffect, useState } from 'react'

const COLORS = [
  { name: 'Indigo', value: '#4f46e5', soft: '#eef2ff' },
  { name: 'Pink', value: '#db2777', soft: '#fce7f3' },
  { name: 'Teal', value: '#0d9488', soft: '#ccfbf1' },
  { name: 'Orange', value: '#ea580c', soft: '#ffedd5' },
  { name: 'Emerald', value: '#059669', soft: '#d1fae5' },
  { name: 'Slate', value: '#334155', soft: '#f1f5f9' },
]

export default function ThemePicker() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('#4f46e5')

  useEffect(() => {
    const saved = localStorage.getItem('theme-accent')
    const savedSoft = localStorage.getItem('theme-accent-soft')
    if (saved) {
      setCurrent(saved)
      document.documentElement.style.setProperty('--accent', saved)
    }
    if (savedSoft) {
      document.documentElement.style.setProperty('--accent-soft', savedSoft)
    }
  }, [])

  function applyColor(color: { value: string; soft: string }) {
    document.documentElement.style.setProperty('--accent', color.value)
    document.documentElement.style.setProperty('--accent-soft', color.soft)
    localStorage.setItem('theme-accent', color.value)
    localStorage.setItem('theme-accent-soft', color.soft)
    setCurrent(color.value)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 w-10 items-center justify-center rounded-full border"
        style={{ borderColor: 'var(--card-border)' }}
        aria-label="Pilih warna tema"
      >
        <div className="h-5 w-5 rounded-full" style={{ background: current }} />
      </button>

      {open && (
        <div className="card absolute right-0 top-12 z-50 w-56 shadow-lg">
          <p className="mb-3 text-sm font-semibold">Pilih warna tema</p>
          <div className="grid grid-cols-3 gap-3">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => applyColor(c)}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="h-9 w-9 rounded-full border-2"
                  style={{
                    background: c.value,
                    borderColor: current === c.value ? c.value : 'transparent',
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
