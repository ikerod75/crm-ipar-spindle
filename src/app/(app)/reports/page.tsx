import { createClient } from '@/lib/supabase/server'
import { subMonths, startOfMonth, endOfMonth, format, subYears } from 'date-fns'
import { ReportsCharts } from '@/components/reports/ReportsCharts'
import { BarChart3 } from 'lucide-react'
import type { ActivityType } from '@/types/database'

interface CompanySegmentRow {
  province: string | null
  segment: string
}

interface ServiceOrderTypeRow {
  type: string
  created_at: string
}

interface ActivityRow {
  type: string
  created_by: string
  creator: { id: string; full_name: string } | null
}

interface AtRiskRow {
  id: string
  name: string
  segment: string
  province: string | null
}

export default async function ReportsPage() {
  const supabase = await createClient()
  const now = new Date()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()
  const oneYearAgo = subYears(now, 1).toISOString()

  // 1. Companies by segment & province (top 10)
  const { data: companiesRaw } = await supabase
    .from('companies')
    .select('province, segment')
    .not('province', 'is', null)

  const companies = (companiesRaw ?? []) as CompanySegmentRow[]

  const provinceMap: Record<string, { potencial: number; activo: number; recurrente: number }> = {}
  for (const c of companies) {
    const prov = c.province as string
    if (!provinceMap[prov]) provinceMap[prov] = { potencial: 0, activo: 0, recurrente: 0 }
    const seg = c.segment as 'potencial' | 'activo' | 'recurrente'
    if (seg in provinceMap[prov]) provinceMap[prov][seg]++
  }
  const segmentByProvince = Object.entries(provinceMap)
    .map(([province, counts]) => ({
      province,
      total: counts.potencial + counts.activo + counts.recurrente,
      ...counts,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  // 2. Service orders by type last 6 months
  const sixMonthsAgo = subMonths(now, 5)
  const { data: serviceOrdersRaw } = await supabase
    .from('service_orders')
    .select('type, created_at')
    .gte('created_at', startOfMonth(sixMonthsAgo).toISOString())

  const serviceOrders = (serviceOrdersRaw ?? []) as ServiceOrderTypeRow[]
  const serviceTypes = ['reparacion', 'venta_repuesto', 'mantenimiento_preventivo', 'urgencia']

  const monthlyServices: Record<string, Record<string, number>> = {}
  for (let i = 5; i >= 0; i--) {
    const m = subMonths(now, i)
    const key = format(m, 'MMM yy')
    monthlyServices[key] = Object.fromEntries(serviceTypes.map(t => [t, 0]))
  }
  for (const so of serviceOrders) {
    try {
      const key = format(new Date(so.created_at), 'MMM yy')
      if (monthlyServices[key]) {
        monthlyServices[key][so.type] = (monthlyServices[key][so.type] ?? 0) + 1
      }
    } catch {}
  }
  const servicesChartData = Object.entries(monthlyServices).map(([month, counts]) => ({
    month,
    reparacion: counts['reparacion'] ?? 0,
    venta_repuesto: counts['venta_repuesto'] ?? 0,
    mantenimiento_preventivo: counts['mantenimiento_preventivo'] ?? 0,
    urgencia: counts['urgencia'] ?? 0,
  }))

  // 3. Commercial activity this month (calls/visits/emails per user)
  const { data: monthActivitiesRaw } = await supabase
    .from('activities')
    .select('type, created_by, creator:profiles!created_by(id, full_name)')
    .gte('created_at', monthStart)
    .lte('created_at', monthEnd)

  const monthActivities = (monthActivitiesRaw ?? []) as ActivityRow[]

  const userActivityMap: Record<string, {
    name: string
    llamada: number; visita: number; email: number
    whatsapp: number; presupuesto: number; nota: number
  }> = {}

  for (const act of monthActivities) {
    const creator = act.creator as { id: string; full_name: string } | null
    if (!creator) continue
    if (!userActivityMap[creator.id]) {
      userActivityMap[creator.id] = { name: creator.full_name, llamada: 0, visita: 0, email: 0, whatsapp: 0, presupuesto: 0, nota: 0 }
    }
    const t = act.type as ActivityType
    if (t in userActivityMap[creator.id]) {
      (userActivityMap[creator.id] as any)[t]++
    }
  }
  const activityByUser = Object.values(userActivityMap).sort((a, b) => {
    const totalA = a.llamada + a.visita + a.email + a.whatsapp + a.presupuesto + a.nota
    const totalB = b.llamada + b.visita + b.email + b.whatsapp + b.presupuesto + b.nota
    return totalB - totalA
  })

  // 4. Companies at risk: active/recurrent with no service in last 12 months
  const { data: activeCompaniesRaw } = await supabase
    .from('companies')
    .select('id, name, segment, province')
    .in('segment', ['activo', 'recurrente'])

  const activeCompanies = (activeCompaniesRaw ?? []) as AtRiskRow[]

  const { data: recentOrdersRaw } = await supabase
    .from('service_orders')
    .select('company_id')
    .gte('created_at', oneYearAgo)

  const recentOrders = (recentOrdersRaw ?? []) as { company_id: string }[]
  const recentCompanyIds = new Set(recentOrders.map(o => o.company_id))
  const atRiskCompanies = activeCompanies.filter(c => !recentCompanyIds.has(c.id))

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Informes</h1>
      </div>

      <ReportsCharts
        segmentByProvince={segmentByProvince}
        servicesChartData={servicesChartData}
        activityByUser={activityByUser}
        atRiskCompanies={atRiskCompanies}
      />
    </div>
  )
}
