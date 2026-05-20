'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Wrench, Trash2, Loader2 } from 'lucide-react'
import type { ServiceOrder, ServiceStatus, ServiceType } from '@/types/database'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { ServiceOrderForm } from '@/components/service-orders/ServiceOrderForm'
import { OfertaModal } from '@/components/service-orders/OfertaModal'

type ServiceOrderRow = ServiceOrder & {
  company: { id: string; name: string; address: string | null; city: string | null; province: string | null } | null
  assignee: { id: string; full_name: string } | null
  machine: { id: string; brand: string; model: string | null; company_id: string } | null
  contact: { id: string; first_name: string; last_name: string; company_id: string } | null
}

type StatusFilter = ServiceStatus

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'presupuesto', label: 'Presupuesto' },
  { value: 'en_curso', label: 'En curso' },
  { value: 'finalizada', label: 'Finalizada' },
]

function statusClass(status: ServiceStatus): string {
  const map: Record<ServiceStatus, string> = {
    presupuesto: 'bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-400',
    en_curso: 'bg-yellow-500/10 text-yellow-700 ring-yellow-500/20 dark:text-yellow-400',
    finalizada: 'bg-green-500/10 text-green-700 ring-green-500/20 dark:text-green-400',
  }
  return map[status] ?? 'bg-gray-500/10 text-gray-600 ring-gray-500/20'
}

const statusLabel: Record<ServiceStatus, string> = {
  presupuesto: 'Presupuesto',
  en_curso: 'En curso',
  finalizada: 'Finalizada',
}

function typeClass(type: ServiceType): string {
  const map: Record<ServiceType, string> = {
    reparacion: 'bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-400',
    venta_repuesto: 'bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-400',
    mantenimiento_preventivo: 'bg-green-500/10 text-green-700 ring-green-500/20 dark:text-green-400',
    urgencia: 'bg-red-600/10 text-red-800 ring-red-600/20 dark:text-red-300',
  }
  return map[type]
}

const typeLabel: Record<ServiceType, string> = {
  reparacion: 'Reparación',
  venta_repuesto: 'Repuesto',
  mantenimiento_preventivo: 'Mantenimiento',
  urgencia: 'Urgencia',
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  try { return format(parseISO(d), 'dd/MM/yyyy') } catch { return d }
}

function fmtAmount(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)
}

export function ServiceOrdersTable({ orders }: { orders: ServiceOrderRow[] }) {
  const router = useRouter()
  const [activeTab, setActiveTab]       = useState<StatusFilter>('presupuesto')
  const [toDelete, setToDelete]         = useState<ServiceOrderRow | null>(null)
  const [deleting, setDeleting]         = useState(false)

  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    // 1 — Delete associated offers first
    const { error: offersError } = await sb
      .from('offers')
      .delete()
      .eq('order_id', toDelete.id)

    if (offersError) {
      // Non-blocking: if offers table doesn't exist yet, continue anyway
      console.warn('Could not delete offers:', offersError.message)
    }

    // 2 — Delete the service order
    const { error } = await sb
      .from('service_orders')
      .delete()
      .eq('id', toDelete.id)

    setDeleting(false)
    if (error) {
      toast.error('Error al eliminar la orden: ' + error.message)
    } else {
      toast.success(`Orden ${toDelete.order_number} eliminada`)
      setToDelete(null)
      router.refresh()
    }
  }

  const filtered = orders.filter(o => o.status === activeTab)

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            <span className="ml-1.5 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
              {orders.filter(o => o.status === tab.value).length}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wrench className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay órdenes en esta categoría</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Nº orden</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Título</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empresa</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Importe</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Técnico</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Recepción</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Entrega</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, idx) => (
                  <tr
                    key={order.id}
                    className={`border-b last:border-0 hover:bg-accent/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {order.order_number}
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">
                      {order.title}
                      {order.machine && (
                        <p className="text-xs text-muted-foreground font-normal">
                          {order.machine.brand} {order.machine.model}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {order.company ? (
                        <Link href={`/companies/${order.company.id}`} className="text-primary hover:underline">
                          {order.company.name}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${typeClass(order.type)}`}>
                        {typeLabel[order.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${statusClass(order.status)}`}>
                        {statusLabel[order.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {fmtAmount(order.amount)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {order.assignee?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {fmtDate(order.received_date)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {fmtDate(order.delivery_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <OfertaModal order={order} />
                        <ServiceOrderForm order={order} />
                        <Button
                          variant="ghost" size="icon-sm"
                          title="Eliminar orden"
                          onClick={() => setToDelete(order)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Confirm delete dialog ─────────────────────────────────────── */}
      <Dialog open={!!toDelete} onOpenChange={v => { if (!v) setToDelete(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Eliminar orden
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Seguro que quieres eliminar la orden{' '}
            <span className="font-semibold text-foreground font-mono">
              {toDelete?.order_number}
            </span>
            {toDelete?.title && (
              <> — <span className="italic">{toDelete.title}</span></>
            )}
            ? Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting
                ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Eliminando…</>
                : <><Trash2 className="h-3.5 w-3.5 mr-1" />Eliminar</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
