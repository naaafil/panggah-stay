'use client'

import { useEffect } from 'react'

export default function ThemeInit() {
  useEffect(() => {
    const accent = localStorage.getItem('theme-accent')
    const soft = localStorage.getItem('theme-accent-soft')
    if (accent) document.documentElement.style.setProperty('--accent', accent)
    if (soft) {
      document.documentElement.style.setProperty('--accent-soft', soft)
      document.documentElement.style.setProperty('--background', soft)
    }
  }, [])

  return null
}
