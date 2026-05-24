'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Mail, ArrowRight, Phone, MapPin, MessageSquare, FileText, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ActivityType } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ActivityRow {
  id: string
  title: string
  type: ActivityType
  responsable: string | null
  next_action: string | null
  next_action_date: string | null
  created_at: string
  company: { id: string; name: string } | null
  contact: { id: string; first_name: string; last_name: string } | null
}

interface ActivityByPersonProps {
  activities: ActivityRow[]
}

// ─── Config ───────────────────────────────────────────────────────────────────
const RESPONSABLES = [
  { nombre: 'Iker',  email: 'info@iparspindle.com' },
  { nombre: 'Dani',  email: 'dani@iparspindle.com' },
  { nombre: 'Maria', email: 'maria@iparmaquina.com' },
  { nombre: 'Zigor', email: 'zigor@iparspindle.com' },
  { nombre: 'Beñat', email: 'zigor@iparspindle.com' },
]

const typeIcon: Record<ActivityType, React.ElementType> = {
  llamada: Phone,
  visita: MapPin,
  email: Mail,
  whatsapp: MessageSquare,
  presupuesto: FileText,
  nota: StickyNote,
}

const typeLabel: Record<ActivityType, string> = {
  llamada: 'Llamada',
  visita: 'Visita',
  email: 'Email',
  whatsapp: 'WhatsApp',
  presupuesto: 'Presupuesto',
  nota: 'Nota',
}

const typeColor: Record<ActivityType, string> = {
  llamada: 'bg-blue-500/10 text-blue-600',
  visita: 'bg-green-500/10 text-green-600',
  email: 'bg-purple-500/10 text-purple-600',
  whatsapp: 'bg-emerald-500/10 text-emerald-600',
  presupuesto: 'bg-orange-500/10 text-orange-600',
  nota: 'bg-gray-500/10 text-gray-600',
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ActivityByPerson({ activities }: ActivityByPersonProps) {
  const [selected, setSelected] = useState<string>('')

  const persona = RESPONSABLES.find(r => r.nombre === selected)
  const filtered = selected
    ? activities.filter(a => a.responsable === selected)
    : []

  const pending = filtered.filter(a => a.next_action)

  // ── Build mailto ────────────────────────────────────────────────────────────
  function handleSendEmail() {
    if (!persona || pending.length === 0) return

    const subject = encodeURIComponent(`Actividades pendientes — ${persona.nombre}`)

    const lines = pending.map(a => {
      const empresa = a.company?.name ?? '—'
      const fecha = a.next_action_date
        ? format(parseISO(a.next_action_date), "d 'de' MMMM yyyy", { locale: es })
        : 'Sin fecha'
      return `• ${a.title} (${empresa})\n  Acción: ${a.next_action}\n  Fecha: ${fecha}`
    }).join('\n\n')

    const body = encodeURIComponent(
      `Hola ${persona.nombre},\n\nTe resumo las actividades comerciales pendientes asignadas a ti:\n\n${lines}\n\nUn saludo,\nIpar Spindle CRM`
    )

    window.open(`mailto:${persona.email}?subject=${subject}&body=${body}`, '_blank')
  }

  return (
    <div className="space-y-4">

      {/* Selector de persona */}
      <div className="flex flex-wrap gap-2">
        {RESPONSABLES.map(r => (
          <button
            key={r.nombre}
            onClick={() => setSelected(selected === r.nombre ? '' : r.nombre)}
            className={[
              'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
              selected === r.nombre
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-muted',
            ].join(' ')}
          >
            {r.nombre}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {!selected ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Selecciona una persona para ver sus actividades
        </div>
      ) : (
        <>
          {/* Header con email */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{filtered.length}</span> actividades
              {pending.length > 0 && (
                <> · <span className="font-semibold text-primary">{pending.length} pendientes</span></>
              )}
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={pending.length === 0}
              onClick={handleSendEmail}
              title={pending.length === 0 ? 'No hay actividades pendientes' : `Enviar ${pending.length} actividades pendientes por email`}
            >
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Enviar pendientes por email
            </Button>
          </div>

          {/* Lista */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No hay actividades asignadas a {selected}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(a => {
                const Icon = typeIcon[a.type]
                return (
                  <div
                    key={a.id}
                    className="flex gap-3 p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${typeColor[a.type]}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{a.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">{typeLabel[a.type]}</span>
                        {a.company && (
                          <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">{a.company.name}</span>
                          </>
                        )}
                        {a.contact && (
                          <>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">
                              {a.contact.first_name} {a.contact.last_name}
                            </span>
                          </>
                        )}
                      </div>
                      {a.next_action && (
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          <ArrowRight className="h-3 w-3 flex-shrink-0 text-primary" />
                          <span>
                            <span className="font-medium text-foreground">{a.next_action}</span>
                            {a.next_action_date && (
                              <span className="ml-1">
                                — {format(parseISO(a.next_action_date), "d MMM yyyy", { locale: es })}
                              </span>
                            )}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
