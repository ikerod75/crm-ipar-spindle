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
      <div className="font-mono font-bold leading-none tracking-tight text-foreground text-3xl">
        {hh}
        <span className="opacity-40 animate-pulse">:</span>
        {mm}
        <span className="opacity-40 animate-pulse">:</span>
        {ss}
      </div>
      {/* Date */}
      <div className="mt-1 text-muted-foreground font-medium tracking-wider uppercase text-[0.65rem]">
        {day}, {date} DE {month} DE {year}
      </div>
    </div>
  )
}
