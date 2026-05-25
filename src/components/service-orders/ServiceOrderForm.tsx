'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { CompanySearch, type CompanyOption } from '@/components/shared/CompanySearch'
import { ContactSearch, type ContactOption } from '@/components/shared/ContactSearch'
import type { ServiceType, ServiceStatus, ServiceOrder } from '@/types/database'
import { Plus, Pencil, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Machine { id: string; brand: string; model: string | null; company_id: string }
interface UserProfile { id: string; full_name: string }

// Full order row shape coming from the table (with joins)
type OrderRow = ServiceOrder & {
  company: { id: string; name: string } | null
  contact: { id: string; first_name: string; last_name: string; company_id: string } | null
  machine: { id: string; brand: string; model: string | null; company_id: string } | null
  assignee: { id: string; full_name: string } | null
}

interface ServiceOrderFormProps {
  /** If provided → edit mode. If null → create mode. */
  order?: OrderRow | null
  /** Custom trigger element. Defaults to "Nueva orden" / pencil icon button. */
  trigger?: React.ReactNode
}

export function ServiceOrderForm({ order, trigger }: ServiceOrderFormProps = {}) {
  const router = useRouter()
  const isEdit = !!order
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [machines, setMachines] = useState<Machine[]>([])
  const [users, setUsers] = useState<UserProfile[]>([]) // kept for future use

  // ── form state ──────────────────────────────────────────────────────────────
  const [orderNumber, setOrderNumber] = useState(order?.order_number ?? '')
  const [company, setCompany] = useState<CompanyOption | null>(
    order?.company ? { id: order.company.id, name: order.company.name } : null
  )
  const [contact, setContact] = useState<ContactOption | null>(
    order?.contact
      ? { id: order.contact.id, first_name: order.contact.first_name,
          last_name: order.contact.last_name, company_id: order.contact.company_id }
      : null
  )
  const [machineId, setMachineId] = useState(order?.machine_id ?? '')
  const [title, setTitle] = useState(order?.title ?? '')
  const [description, setDescription] = useState(order?.description ?? '')
  const [type, setType] = useState<ServiceType>(order?.type ?? 'reparacion')
  // Normalize legacy statuses from DB that no longer exist in the UI
  const normalizeStatus = (s: string | null | undefined): ServiceStatus => {
    if (s === 'finalizado') return 'finalizada'
    if (s === 'cancelado') return 'presupuesto'
    if (s === 'presupuesto' || s === 'en_curso' || s === 'finalizada') return s
    return 'presupuesto'
  }
  const [status, setStatus] = useState<ServiceStatus>(normalizeStatus(order?.status))
  const [amount, setAmount] = useState(order?.amount != null ? String(order.amount) : '')
  const [costEstimate, setCostEstimate] = useState(order?.cost_estimate != null ? String(order.cost_estimate) : '')
  const [receivedDate, setReceivedDate] = useState(order?.received_date ?? '')
  const [deliveryDate, setDeliveryDate] = useState(order?.delivery_date ?? '')
  const [assignedTo, setAssignedTo] = useState(order?.assigned_to ?? '')
  const [notes, setNotes] = useState(order?.notes ?? '')

  // Load users on open; machines when company changes
  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.from('profiles').select('id,full_name').eq('active', true).order('full_name')
      .then(({ data }) => setUsers((data as UserProfile[]) ?? []))
  }, [open])

  useEffect(() => {
    if (!company) { setMachines([]); if (!isEdit) setMachineId(''); return }
    const supabase = createClient()
    supabase.from('machines').select('id,brand,model,company_id')
      .eq('company_id', company.id).order('brand')
      .then(({ data }) => {
        setMachines((data as Machine[]) ?? [])
        // In edit mode keep the existing machine; in create mode reset
        if (!isEdit) setMachineId('')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id])

  function resetForm() {
    if (isEdit) {
      // Restore original values
      setOrderNumber(order?.order_number ?? '')
      setCompany(order?.company ? { id: order.company.id, name: order.company.name } : null)
      setContact(order?.contact
        ? { id: order.contact.id, first_name: order.contact.first_name,
            last_name: order.contact.last_name, company_id: order.contact.company_id }
        : null)
      setMachineId(order?.machine_id ?? '')
      setTitle(order?.title ?? '')
      setDescription(order?.description ?? '')
      setType(order?.type ?? 'reparacion')
      setStatus(normalizeStatus(order?.status))
      setAmount(order?.amount != null ? String(order.amount) : '')
      setCostEstimate(order?.cost_estimate != null ? String(order.cost_estimate) : '')
      setReceivedDate(order?.received_date ?? '')
      setDeliveryDate(order?.delivery_date ?? '')
      setAssignedTo(order?.assigned_to ?? '')
      setNotes(order?.notes ?? '')
    } else {
      setOrderNumber(''); setCompany(null); setContact(null); setMachineId('')
      setTitle(''); setDescription(''); setType('reparacion'); setStatus('presupuesto')
      setAmount(''); setCostEstimate(''); setReceivedDate(''); setDeliveryDate('')
      setAssignedTo(''); setNotes(''); setMachines([])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validations
    if (!orderNumber.trim()) { toast.error('El número de orden es obligatorio'); return }
    if (!company) { toast.error('Selecciona una empresa'); return }
    if (!title.trim()) { toast.error('El título es obligatorio'); return }

    setLoading(true)
    const supabase = createClient()

    // Unique order_number check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dupQuery = (supabase as any)
      .from('service_orders')
      .select('id')
      .eq('order_number', orderNumber.trim())

    // In edit mode exclude the current order
    if (isEdit && order?.id) dupQuery = dupQuery.neq('id', order.id)

    const { data: dup } = await dupQuery.maybeSingle()
    if (dup) {
      toast.error(`Ya existe una orden con el número "${orderNumber.trim()}". Elige otro.`)
      setLoading(false)
      return
    }

    const payload = {
      order_number: orderNumber.trim(),
      company_id: company.id,
      machine_id: machineId || null,
      contact_id: contact?.id ?? null,
      title: title.trim(),
      description: description.trim() || null,
      type,
      status,
      amount: amount ? parseFloat(amount) : null,
      cost_estimate: costEstimate ? parseFloat(costEstimate) : null,
      received_date: receivedDate || null,
      delivery_date: deliveryDate || null,
      assigned_to: assignedTo || null,
      notes: notes.trim() || null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const { error } = isEdit
      ? await sb.from('service_orders').update(payload).eq('id', order!.id)
      : await sb.from('service_orders').insert(payload)

    setLoading(false)
    if (error) {
      toast.error((isEdit ? 'Error al actualizar: ' : 'Error al crear: ') + error.message)
    } else {
      toast.success(isEdit ? 'Orden actualizada correctamente' : 'Orden de servicio creada correctamente')
      setOpen(false)
      router.refresh()
    }
  }

  // ── Trigger button ──────────────────────────────────────────────────────────
  const defaultTrigger = isEdit ? (
    <Button variant="ghost" size="icon-sm" title="Editar orden">
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  ) : (
    <Button>
      <Plus className="h-4 w-4 mr-1" />
      Nueva orden
    </Button>
  )

  return (
    <>
      <span className="contents" onClick={() => setOpen(true)}>
        {trigger ?? defaultTrigger}
      </span>

      <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); setOpen(v) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? `Editar orden ${order?.order_number}` : 'Nueva orden de servicio'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">

              {/* Número de orden — MANUAL, obligatorio */}
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="order_number">
                  Número de orden <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="order_number"
                  value={orderNumber}
                  onChange={e => setOrderNumber(e.target.value)}
                  placeholder="Ej: 2024-001, OS-123, TK-0042…"
                  className="font-mono"
                />
              </div>

              {/* Empresa */}
              <div className="col-span-2 space-y-1.5">
                <Label>Empresa <span className="text-destructive">*</span></Label>
                <CompanySearch value={company} onChange={setCompany} />
              </div>

              {/* Contacto */}
              <div className="space-y-1.5">
                <Label>Contacto</Label>
                <ContactSearch value={contact} onChange={setContact} companyId={company?.id ?? null} />
              </div>

              {/* Título */}
              <div className="col-span-2 space-y-1.5">
                <Label>Título <span className="text-destructive">*</span></Label>
                <Input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Reparación husillo principal" />
              </div>

              {/* Descripción */}
              <div className="col-span-2 space-y-1.5">
                <Label>Descripción</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)}
                  rows={2} placeholder="Detalles del trabajo…" />
              </div>

              {/* Tipo */}
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={v => setType((v ?? 'reparacion') as ServiceType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reparacion">Reparación</SelectItem>
                    <SelectItem value="venta_repuesto">Venta de repuesto</SelectItem>
                    <SelectItem value="mantenimiento_preventivo">Mantenimiento preventivo</SelectItem>
                    <SelectItem value="urgencia">Urgencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <div className="flex rounded-md border overflow-hidden">
                  {([
                    { value: 'presupuesto', label: 'Presupuesto' },
                    { value: 'en_curso',    label: 'En curso' },
                    { value: 'finalizada',  label: 'Finalizada' },
                  ] as { value: ServiceStatus; label: string }[]).map((opt, i, arr) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={[
                        'flex-1 py-2 text-sm font-medium transition-colors',
                        i < arr.length - 1 ? 'border-r' : '',
                        status === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted',
                      ].join(' ')}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fecha recepción */}
              <div className="space-y-1.5">
                <Label>Fecha recepción</Label>
                <Input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} />
              </div>

              {/* Fecha entrega */}
              <div className="space-y-1.5">
                <Label>Fecha entrega prevista</Label>
                <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
              </div>

              {/* Técnico */}
              <div className="col-span-2 space-y-1.5">
                <Label>Técnico asignado</Label>
                <div className="flex gap-2 flex-wrap">
                  {['Zigor', 'Beñat', 'Dani', 'Iker'].map(nombre => (
                    <button
                      key={nombre}
                      type="button"
                      onClick={() => setAssignedTo(assignedTo === nombre ? '' : nombre)}
                      className={[
                        'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                        assignedTo === nombre
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted',
                      ].join(' ')}
                    >
                      {nombre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div className="col-span-2 space-y-1.5">
                <Label>Notas internas</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} placeholder="Notas internas…" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setOpen(false) }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear orden'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
