import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { Building2, TrendingUp, AlertTriangle, CalendarClock, Activity } from 'lucide-react'
import { format, subDays, subMonths, startOfYear } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import type { CompanySegment } from '@/types/database'

export const dynamic = 'force-dynamic'

type CompanyRow = { id: string; name: string; segment: CompanySegment }
type OrderRow = {
  id: string
  status: string
  amount: number | null
  created_at: string
  company_id: string
  companies: { name: string } | null
}
type ActivityRow = {
  id: string
  title: string
  next_action_date: string | null
  next_action: string | null
  created_at: string
  type: string
  outcome: string | null
  companies: { name: string; id: string } | null
}

function formatCurrency(amount: number) {
  return amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const now = new Date()
  const ytdStart = startOfYear(now).toISOString()
  const lastYearStart = startOfYear(new Date(now.getFullYear() - 1, 0, 1)).toISOString()
  const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString()
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const last90Days = subDays(now, 90).toISOString()

  // --- Parallel fetches ---
  const [
    companiesRes,
    serviceOrdersRes,
    ytdOrdersRes,
    lastYearOrdersRes,
    upcomingActivitiesRes,
    recentActivitiesRes,
    allCompaniesRes,
  ] = await Promise.all([
    supabase.from('companies').select('id, segment'),
    supabase.from('service_orders').select('id, status, amount, created_at, company_id, companies(name)'),
    supabase.from('service_orders').select('amount').eq('status', 'finalizado').gte('created_at', ytdStart),
    supabase.from('service_orders').select('amount').eq('status', 'finalizado').gte('created_at', lastYearStart).lte('created_at', lastYearEnd),
    supabase
      .from('activities')
      .select('id, title, next_action_date, next_action, company_id, companies(name, id)')
      .gte('next_action_date', now.toISOString().slice(0, 10))
      .lte('next_action_date', next7Days.slice(0, 10))
      .order('next_action_date', { ascending: true })
      .limit(10),
    supabase
      .from('activities')
      .select('id, type, title, created_at, company_id, outcome, companies(name, id)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('companies').select('id, name, segment'),
  ])

  const companies = (companiesRes.data ?? []) as CompanyRow[]
  const serviceOrders = (serviceOrdersRes.data ?? []) as OrderRow[]
  const ytdOrders = (ytdOrdersRes.data ?? []) as { amount: number | null }[]
  const lastYearOrders = (lastYearOrdersRes.data ?? []) as { amount: number | null }[]
  const upcomingActivities = (upcomingActivitiesRes.data ?? []) as ActivityRow[]
  const recentActivities = (recentActivitiesRes.data ?? []) as ActivityRow[]
  const allCompanies = (allCompaniesRes.data ?? []) as CompanyRow[]

  // --- Companies with no recent activity ---
  const recentActivityRes = await supabase
    .from('activities')
    .select('company_id')
    .gte('created_at', last90Days)

  const activeSet = new Set(
    ((recentActivityRes.data ?? []) as { company_id: string }[]).map((a) => a.company_id)
  )
  const inactiveCompanies = allCompanies
    .filter((c) => c.segment !== 'potencial' && !activeSet.has(c.id))
    .slice(0, 5)

  // --- Segment counts ---
  const segmentCounts = companies.reduce(
    (acc, c) => {
      acc[c.segment] = (acc[c.segment] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // --- Revenue ---
  const ytdRevenue = ytdOrders.reduce((sum, o) => sum + (o.amount || 0), 0)
  const lastYearRevenue = lastYearOrders.reduce((sum, o) => sum + (o.amount || 0), 0)
  const revenueGrowth =
    lastYearRevenue > 0 ? ((ytdRevenue - lastYearRevenue) / lastYearRevenue) * 100 : null

  // --- Top 5 companies by revenue ---
  const companyRevenue: Record<string, { name: string; total: number }> = {}
  for (const order of serviceOrders) {
    if (order.status === 'finalizado' && order.company_id && order.amount) {
      const compName = order.companies?.name || order.company_id
      if (!companyRevenue[order.company_id]) {
        companyRevenue[order.company_id] = { name: compName, total: 0 }
      }
      companyRevenue[order.company_id].total += order.amount
    }
  }
  const top5Companies = Object.entries(companyRevenue)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)

  // --- Monthly chart data (last 12 months) ---
  const monthlyMap: Record<string, { count: number; amount: number }> = {}
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(now, i)
    const key = format(d, 'MMM yy', { locale: es })
    monthlyMap[key] = { count: 0, amount: 0 }
  }
  for (const order of serviceOrders) {
    const d = new Date(order.created_at)
    const key = format(d, 'MMM yy', { locale: es })
    if (monthlyMap[key] !== undefined) {
      monthlyMap[key].count += 1
      monthlyMap[key].amount += order.amount || 0
    }
  }
  const monthlyData = Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v }))

  const activityTypeLabel: Record<string, string> = {
    llamada: '📞',
    visita: '🏢',
    email: '📧',
    whatsapp: '💬',
    presupuesto: '📋',
    nota: '📝',
  }

  const outcomeColor: Record<string, string> = {
    positivo: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    negativo: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    sin_respuesta: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Resumen comercial · {format(now, "d 'de' MMMM yyyy", { locale: es })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Potencial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{segmentCounts.potencial || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">empresas en pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-green-600" />
              Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{segmentCounts.activo || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">clientes activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-600" />
              Recurrente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{segmentCounts.recurrente || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">clientes recurrentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Facturación YTD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(ytdRevenue)}</p>
            {revenueGrowth !== null && (
              <p
                className={`text-xs mt-1 font-medium ${
                  revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {revenueGrowth >= 0 ? '+' : ''}
                {revenueGrowth.toFixed(1)}% vs año anterior
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart + Upcoming actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Órdenes de servicio · últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardCharts monthlyData={monthlyData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Próximas acciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin acciones programadas en los próximos 7 días.</p>
            ) : (
              upcomingActivities.map((act) => (
                <div key={act.id} className="flex flex-col gap-0.5 border-b pb-2 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight line-clamp-2">
                      {act.next_action || act.title}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {act.next_action_date
                        ? format(new Date(act.next_action_date), 'd MMM', { locale: es })
                        : ''}
                    </span>
                  </div>
                  {act.companies && (
                    <Link
                      href={`/companies/${act.companies.id}`}
                      className="text-xs text-primary hover:underline truncate"
                    >
                      {act.companies.name}
                    </Link>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent activities */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Últimas actividades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin actividades recientes.</p>
              ) : (
                recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 border-b pb-2 last:border-0">
                    <span className="text-lg leading-tight">{activityTypeLabel[act.type] || '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{act.title}</p>
                        {act.outcome && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                              outcomeColor[act.outcome] || ''
                            }`}
                          >
                            {act.outcome}
                          </span>
                        )}
                      </div>
                      {act.companies && (
                        <Link
                          href={`/companies/${act.companies.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          {act.companies.name}
                        </Link>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {format(new Date(act.created_at), 'd MMM', { locale: es })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Inactive alert */}
          <Card className="border-amber-200 dark:border-amber-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Sin actividad 90 días
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inactiveCompanies.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todo al día.</p>
              ) : (
                <ul className="space-y-1.5">
                  {inactiveCompanies.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/companies/${c.id}`}
                        className="text-sm hover:underline text-foreground flex items-center justify-between"
                      >
                        <span className="truncate">{c.name}</span>
                        <SegmentBadge segment={c.segment} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Top companies */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top clientes</CardTitle>
            </CardHeader>
            <CardContent>
              {top5Companies.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos de facturación.</p>
              ) : (
                <ol className="space-y-2">
                  {top5Companies.map(([id, { name, total }], idx) => (
                    <li key={id} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-4">{idx + 1}.</span>
                      <Link href={`/companies/${id}`} className="text-sm hover:underline flex-1 truncate">
                        {name}
                      </Link>
                      <span className="text-xs font-semibold text-muted-foreground shrink-0">
                        {formatCurrency(total)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SegmentBadge({ segment }: { segment: string }) {
  if (segment === 'potencial') {
    return (
      <Badge className="text-xs py-0 px-1.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-0">
        potencial
      </Badge>
    )
  }
  if (segment === 'activo') {
    return (
      <Badge className="text-xs py-0 px-1.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0">
        activo
      </Badge>
    )
  }
  return (
    <Badge className="text-xs py-0 px-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-0">
      recurrente
    </Badge>
  )
}
