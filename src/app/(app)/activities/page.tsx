import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow, isWithinInterval, addDays, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ActivityDialog } from '@/components/activities/ActivityDialog'
import { ActivityByPerson } from '@/components/activities/ActivityByPerson'
import { ActivityTabs } from '@/components/activities/ActivityTabs'
import {
  Phone, MapPin, Mail, MessageSquare, FileText, StickyNote, ArrowRight, CalendarClock,
} from 'lucide-react'
import type { Activity, ActivityType, ActivityOutcome } from '@/types/database'

type ActivityRow = Activity & {
  company: { id: string; name: string } | null
  contact: { id: string; first_name: string; last_name: string } | null
  creator: { id: string; full_name: string } | null
  responsable: string | null
}

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
  llamada: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  visita: 'bg-green-500/10 text-green-600 dark:text-green-400',
  email: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  whatsapp: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  presupuesto: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  nota: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
}

function outcomeVariant(outcome: ActivityOutcome | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (outcome === 'positivo') return 'default'
  if (outcome === 'negativo') return 'destructive'
  return 'outline'
}

function outcomeLabel(outcome: ActivityOutcome | null): string {
  if (!outcome) return '—'
  const map: Record<ActivityOutcome, string> = {
    positivo: 'Positivo',
    neutral: 'Neutral',
    negativo: 'Negativo',
    sin_respuesta: 'Sin respuesta',
  }
  return map[outcome]
}

function outcomeClassName(outcome: ActivityOutcome | null): string {
  if (outcome === 'positivo') return 'bg-green-500/10 text-green-700 ring-green-500/20 dark:text-green-400'
  if (outcome === 'negativo') return 'bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-400'
  if (outcome === 'sin_respuesta') return 'bg-yellow-500/10 text-yellow-700 ring-yellow-500/20 dark:text-yellow-400'
  return 'bg-gray-500/10 text-gray-600 ring-gray-500/20 dark:text-gray-400'
}

function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    const distance = formatDistanceToNow(date, { addSuffix: true, locale: es })
    const daysDiff = Math.abs((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff < 30) return distance
    return format(date, 'dd/MM/yyyy')
  } catch {
    return dateStr
  }
}

function ActivityCard({ activity }: { activity: ActivityRow }) {
  const Icon = typeIcon[activity.type]

  return (
    <div className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${typeColor[activity.type]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{activity.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{typeLabel[activity.type]}</span>
              {activity.company && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <Link
                    href={`/companies/${activity.company.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {activity.company.name}
                  </Link>
                </>
              )}
              {activity.contact && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {activity.contact.first_name} {activity.contact.last_name}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${outcomeClassName(activity.outcome)}`}
            >
              {outcomeLabel(activity.outcome)}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDate(activity.created_at)}
            </span>
          </div>
        </div>
        {activity.next_action && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <ArrowRight className="h-3 w-3 flex-shrink-0" />
            <span>
              Próxima acción: <span className="font-medium text-foreground">{activity.next_action}</span>
              {activity.next_action_date && (
                <span> — {format(parseISO(activity.next_action_date), 'dd/MM/yyyy')}</span>
              )}
            </span>
          </p>
        )}
        {activity.creator && (
          <p className="text-xs text-muted-foreground mt-1">
            Por {activity.creator.full_name}
          </p>
        )}
      </div>
    </div>
  )
}

export default async function ActivitiesPage() {
  const supabase = await createClient()

  const { data: activities } = await supabase
    .from('activities')
    .select('*, company:companies(id,name), contact:contacts(id,first_name,last_name), creator:profiles!created_by(id,full_name), responsable')
    .order('created_at', { ascending: false })
    .range(0, 99)

  const rows = (activities ?? []) as ActivityRow[]

  const now = new Date()
  const in30Days = addDays(now, 30)
  const upcoming = rows
    .filter(a => a.next_action_date)
    .filter(a => {
      try {
        const d = parseISO(a.next_action_date!)
        return isWithinInterval(d, { start: now, end: in30Days })
      } catch { return false }
    })
    .sort((a, b) => a.next_action_date!.localeCompare(b.next_action_date!))

  // Group upcoming by date
  const groupedUpcoming = upcoming.reduce<Record<string, ActivityRow[]>>((acc, a) => {
    const key = a.next_action_date!
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  // Serialisable data for client components
  const allActivities = rows.map(a => ({
    id: a.id,
    title: a.title,
    type: a.type,
    responsable: a.responsable ?? null,
    next_action: a.next_action ?? null,
    next_action_date: a.next_action_date ?? null,
    created_at: a.created_at,
    company: a.company ?? null,
    contact: a.contact ?? null,
  }))

  const todasContent = (
    <div className="space-y-6">
      {/* Pipeline próximas acciones */}
      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Pipeline de próximas acciones</h2>
            <span className="text-xs text-muted-foreground ml-1">({upcoming.length} pendientes en 30 días)</span>
          </div>
          <div className="space-y-4">
            {Object.entries(groupedUpcoming).map(([date, items]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <div className="space-y-2">
                  {items.map(activity => (
                    <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                      <div className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${typeColor[activity.type]}`}>
                        {(() => { const Icon = typeIcon[activity.type]; return <Icon className="h-3.5 w-3.5" /> })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.next_action}</p>
                        <p className="text-xs text-muted-foreground">{activity.title} · {activity.company?.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Activities list */}
      <section>
        <h2 className="text-base font-semibold mb-3">Todas las actividades</h2>
        {rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay actividades registradas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </section>
    </div>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Actividades comerciales</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{rows.length} actividades recientes</p>
        </div>
        <ActivityDialog />
      </div>

      <ActivityTabs
        todasContent={todasContent}
        personaContent={<ActivityByPerson activities={allActivities} />}
      />
    </div>
  )
}
