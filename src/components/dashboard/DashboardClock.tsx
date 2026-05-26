'use client'

import { useEffect, useState } from 'react'

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

const DAYS_ES = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO']
const MONTHS_ES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
]

export function DashboardClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!now) return null

  const hh = pad(now.getHours())
  const mm = pad(now.getMinutes())
  const ss = pad(now.getSeconds())
  const day = DAYS_ES[now.getDay()]
  const date = now.getDate()
  const month = MONTHS_ES[now.getMonth()]
  const year = now.getFullYear()

  return (
    <div className="flex flex-col justify-center">
      {/* Time */}
      <div className="font-mono font-bold leading-none tracking-tight text-foreground"
        style={{ fontSize: 'clamp(4.5rem, 9vw, 8rem)' }}>
        {hh}
        <span className="opacity-50 animate-pulse">:</span>
        {mm}
        <span className="opacity-50 animate-pulse">:</span>
        {ss}
      </div>
      {/* Date */}
      <div className="mt-3 text-muted-foreground font-medium tracking-widest uppercase"
        style={{ fontSize: 'clamp(0.7rem, 1vw, 0.875rem)' }}>
        {day}, {date} DE {month} DE {year}
      </div>
    </div>
  )
}
