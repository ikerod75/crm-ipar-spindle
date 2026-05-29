import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import { DashboardClock } from '@/components/dashboard/DashboardClock'
import {
  Building2,
  TrendingUp,
  CalendarClock,
  Activity,
  FileText,
  Wrench,
} from 'lucide-react'
import { format, subMonths, startOfYear } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type OrderRow = {
  id: string
  order_number: string
  status: string
  amount: number | null
  created_at: string
  company_id: string
  title: string
  companies: { name: string; id: string } | null
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const now = new Date()
  const ytdStart = startOfYear(now).toISOString()
  const lastYearStart = startOfYear(new Date(now.getFullYear() - 1, 0, 1)).toISOString()
  const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString()
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    allOrdersRes,
    ytdOrdersRes,
    lastYearOrdersRes,
    presupuestosRes,
    enCursoRes,
    upcomingActivitiesRes,
    recentActivitiesRes,
  ] = await Promise.all([
    // All orders for chart + top clients
    sb.from('service_orders').select('id, order_number, title, status, amount, created_at, company_id, companies(name, id)'),
    // YTD revenue (finalizada)
    sb.from('service_orders').select('amount').eq('status', 'finalizada').gte('created_at', ytdStart),
    // Last year revenue
    sb.from('service_orders').select('amount').eq('status', 'finalizada').gte('created_at', lastYearStart).lte('created_at', lastYearEnd),
    // Open quotes (presupuesto) — not yet converted to en_curso
    sb.from('service_orders')
      .select('id, order_number, title, amount, created_at, company_id, companies(name, id)')
      .eq('status', 'presupuesto')
      .order('created_at', { ascending: false })
      .limit(8),
    // Orders in progress
    sb.from('service_orders')
      .select('id, order_number, title, amount, created_at, company_id, companies(name, id)')
      .eq('status', 'en_curso')
      .order('created_at', { ascending: false })
      .limit(8),
    // Upcoming next actions (next 7 days)
    sb.from('activities')
      .select('id, title, next_action_date, next_action, company_id, companies(name, id)')
      .gte('next_action_date', now.toISOString().slice(0, 10))
      .lte('next_action_date', next7Days.slice(0, 10))
      .order('next_action_date', { ascending: true })
      .limit(10),
    // Recent activities
    sb.from('activities')
      .select('id, type, title, created_at, company_id, outcome, companies(name, id)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const allOrders = (allOrdersRes.data ?? []) as OrderRow[]
  const ytdOrders = (ytdOrdersRes.data ?? []) as { amount: number | null }[]
  const lastYearOrders = (lastYearOrdersRes.data ?? []) as { amount: number | null }[]
  const presupuestos = (presupuestosRes.data ?? []) as OrderRow[]
  const enCurso = (enCursoRes.data ?? []) as OrderRow[]
  const upcomingActivities = (upcomingActivitiesRes.data ?? []) as ActivityRow[]
  const recentActivities = (recentActivitiesRes.data ?? []) as ActivityRow[]

  // --- Revenue ---
  const ytdRevenue = ytdOrders.reduce((sum, o) => sum + (o.amount || 0), 0)
  const lastYearRevenue = lastYearOrders.reduce((sum, o) => sum + (o.amount || 0), 0)
  const revenueGrowth =
    lastYearRevenue > 0 ? ((ytdRevenue - lastYearRevenue) / lastYearRevenue) * 100 : null

  // --- Top 5 companies by revenue ---
  const companyRevenue: Record<string, { name: string; id: string; total: number }> = {}
  for (const order of allOrders) {
    if (order.status === 'finalizada' && order.company_id && order.amount) {
      if (!companyRevenue[order.company_id]) {
        companyRevenue[order.company_id] = {
          name: order.companies?.name || order.company_id,
          id: order.companies?.id || order.company_id,
          total: 0,
        }
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
  for (const order of allOrders) {
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

  // Presupuesto value total
  const presupuestosTotal = presupuestos.reduce((sum, o) => sum + (o.amount || 0), 0)
  const enCursoTotal = enCurso.reduce((sum, o) => sum + (o.amount || 0), 0)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Resumen comercial</p>
        </div>
        <DashboardClock />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Open quotes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Presupuestos abiertos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{presupuestos.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {presupuestosTotal > 0 ? formatCurrency(presupuestosTotal) : 'Sin importe'}
            </p>
          </CardContent>
        </Card>

        {/* In progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4 text-yellow-500" />
              En curso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{enCurso.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {enCursoTotal > 0 ? formatCurrency(enCursoTotal) : 'Sin importe'}
            </p>
          </CardContent>
        </Card>

        {/* YTD Revenue */}
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
              <p className={`text-xs mt-1 font-medium ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}% vs año anterior
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Open quotes list + upcoming actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Presupuestos abiertos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Presupuestos pendientes de convertir
            </CardTitle>
          </CardHeader>
          <CardContent>
            {presupuestos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay presupuestos abiertos.</p>
            ) : (
              <div className="space-y-2">
                {presupuestos.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{order.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-mono text-muted-foreground">{order.order_number}</span>
                        {order.companies && (
                          <Link href={`/companies/${order.companies.id}`} className="text-xs text-primary hover:underline truncate">
                            {order.companies.name}
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {order.amount != null
                        ? <span className="text-sm font-semibold">{formatCurrency(order.amount)}</span>
                        : <span className="text-xs text-muted-foreground">—</span>
                      }
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'd MMM', { locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximas acciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Próximas acciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin acciones en los próximos 7 días.</p>
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
                    <Link href={`/companies/${act.companies.id}`} className="text-xs text-primary hover:underline truncate">
                      {act.companies.name}
                    </Link>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Órdenes de servicio · últimos 12 meses</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardCharts monthlyData={monthlyData} />
        </CardContent>
      </Card>

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
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${outcomeColor[act.outcome] || ''}`}>
                            {act.outcome}
                          </span>
                        )}
                      </div>
                      {act.companies && (
                        <Link href={`/companies/${act.companies.id}`} className="text-xs text-primary hover:underline">
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
          {/* Top clients by revenue */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Top clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {top5Companies.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin datos de facturación.</p>
              ) : (
                <ol className="space-y-2">
                  {top5Companies.map(([, { name, id, total }], idx) => (
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
