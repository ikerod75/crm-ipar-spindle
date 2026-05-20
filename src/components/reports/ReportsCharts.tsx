'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { TrendingDown, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
interface AtRiskCompany {
  id: string
  name: string
  segment: string
  province: string | null
}

interface ProvinceRow {
  province: string
  total: number
  potencial: number
  activo: number
  recurrente: number
}

interface ServiceMonthRow {
  month: string
  reparacion: number
  venta_repuesto: number
  mantenimiento_preventivo: number
  urgencia: number
}

interface UserActivityRow {
  name: string
  llamada: number
  visita: number
  email: number
  whatsapp: number
  presupuesto: number
  nota: number
}

interface ReportsChartsProps {
  segmentByProvince: ProvinceRow[]
  servicesChartData: ServiceMonthRow[]
  activityByUser: UserActivityRow[]
  atRiskCompanies: AtRiskCompany[]
}

const segmentColor: Record<string, string> = {
  potencial: '#94a3b8',
  activo: '#60a5fa',
  recurrente: '#34d399',
}

const serviceColor: Record<string, string> = {
  reparacion: '#f87171',
  venta_repuesto: '#60a5fa',
  mantenimiento_preventivo: '#34d399',
  urgencia: '#fb923c',
}

const serviceLabel: Record<string, string> = {
  reparacion: 'Reparación',
  venta_repuesto: 'Repuesto',
  mantenimiento_preventivo: 'Mantenimiento',
  urgencia: 'Urgencia',
}

const segmentLabel: Record<string, string> = {
  potencial: 'Potencial',
  activo: 'Activo',
  recurrente: 'Recurrente',
}

export function ReportsCharts({
  segmentByProvince,
  servicesChartData,
  activityByUser,
  atRiskCompanies,
}: ReportsChartsProps) {
  return (
    <div className="space-y-8">
      {/* 1. Segment by province table */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Empresas por provincia y segmento</h2>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Provincia</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Potencial</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Activo</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Recurrente</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {segmentByProvince.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                    Sin datos de provincias
                  </td>
                </tr>
              ) : segmentByProvince.map((row, idx) => (
                <tr key={row.province} className={`border-b last:border-0 ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}>
                  <td className="px-4 py-3 font-medium">{row.province}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{row.potencial || '—'}</td>
                  <td className="px-4 py-3 text-center text-blue-600 dark:text-blue-400 font-medium">{row.activo || '—'}</td>
                  <td className="px-4 py-3 text-center text-green-600 dark:text-green-400 font-medium">{row.recurrente || '—'}</td>
                  <td className="px-4 py-3 text-center font-bold">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Services bar chart */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Servicios por tipo (últimos 6 meses)</h2>
        <div className="rounded-lg border bg-card p-4">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={servicesChartData} margin={{ top: 0, right: 16, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)',
                  color: 'hsl(var(--popover-foreground))',
                  fontSize: '12px',
                }}
              />
              <Legend
                formatter={(value) => serviceLabel[value] || value}
                wrapperStyle={{ fontSize: '12px' }}
              />
              {Object.keys(serviceColor).map(type => (
                <Bar key={type} dataKey={type} name={type} stackId="a" fill={serviceColor[type]} radius={type === 'urgencia' ? [4, 4, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 3. Activity by user this month */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Actividad comercial este mes</h2>
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Comercial</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Llamadas</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Visitas</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Emails</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">WhatsApp</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Presupuestos</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {activityByUser.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                    Sin actividad este mes
                  </td>
                </tr>
              ) : activityByUser.map((user, idx) => {
                const total = user.llamada + user.visita + user.email + user.whatsapp + user.presupuesto + user.nota
                return (
                  <tr key={user.name} className={`border-b last:border-0 ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-center">{user.llamada || '—'}</td>
                    <td className="px-4 py-3 text-center">{user.visita || '—'}</td>
                    <td className="px-4 py-3 text-center">{user.email || '—'}</td>
                    <td className="px-4 py-3 text-center">{user.whatsapp || '—'}</td>
                    <td className="px-4 py-3 text-center">{user.presupuesto || '—'}</td>
                    <td className="px-4 py-3 text-center font-bold">{total}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. At-risk clients */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold">Clientes en riesgo</h2>
          <span className="text-sm text-muted-foreground">(sin servicio en los últimos 12 meses)</span>
          {atRiskCompanies.length > 0 && (
            <span className="ml-auto text-sm font-medium text-red-600 dark:text-red-400">
              {atRiskCompanies.length} empresas
            </span>
          )}
        </div>
        {atRiskCompanies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg">
            ¡Sin clientes en riesgo! Todos los clientes activos han recibido servicio en el último año.
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empresa</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Segmento</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Provincia</th>
                </tr>
              </thead>
              <tbody>
                {atRiskCompanies.map((company, idx) => (
                  <tr key={company.id} className={`border-b last:border-0 hover:bg-accent/30 ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="px-4 py-3">
                      <Link href={`/companies/${company.id}`} className="text-primary hover:underline font-medium flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
                        {company.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{company.segment}</td>
                    <td className="px-4 py-3 text-muted-foreground">{company.province || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
