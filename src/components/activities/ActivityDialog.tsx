'use client'

import { useState } from 'react'
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
import type { ActivityType, ActivityOutcome } from '@/types/database'
import { Plus, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function ActivityDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [company, setCompany] = useState<CompanyOption | null>(null)
  const [contact, setContact] = useState<ContactOption | null>(null)
  const [type, setType] = useState<ActivityType>('llamada')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [outcome, setOutcome] = useState<ActivityOutcome>('neutral')
  const [nextAction, setNextAction] = useState('')
  const [nextActionDate, setNextActionDate] = useState('')
  const [responsable, setResponsable] = useState('')

  const RESPONSABLES = ['Iker', 'Dani', 'Maria', 'Zigor', 'Beñat']

  function resetForm() {
    setCompany(null); setContact(null); setType('llamada'); setTitle('')
    setDescription(''); setOutcome('neutral'); setNextAction(''); setNextActionDate('')
    setResponsable('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!company) { toast.error('Selecciona una empresa'); return }
    if (!title.trim()) { toast.error('El título es obligatorio'); return }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('No autenticado'); setLoading(false); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('activities') as any).insert({
      company_id: company.id,
      contact_id: contact?.id ?? null,
      type,
      title: title.trim(),
      description: description.trim() || null,
      outcome,
      next_action: nextAction.trim() || null,
      next_action_date: nextActionDate || null,
      created_by: user.id,
      responsable: responsable || null,
    })

    setLoading(false)
    if (error) {
      toast.error('Error al crear la actividad: ' + error.message)
    } else {
      toast.success('Actividad registrada correctamente')
      setOpen(false)
      resetForm()
      router.refresh()
    }
  }

  return (
    <>
      <span className="contents" onClick={() => setOpen(true)}>
        <Button>
          <Plus className="h-4 w-4" />
          Nueva actividad
        </Button>
      </span>

      <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); setOpen(v) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva actividad comercial</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">

              {/* Empresa */}
              <div className="col-span-2 space-y-1.5">
                <Label>Empresa <span className="text-destructive">*</span></Label>
                <CompanySearch value={company} onChange={setCompany} />
              </div>

              {/* Contacto */}
              <div className="col-span-2 space-y-1.5">
                <Label>Contacto</Label>
                <ContactSearch value={contact} onChange={setContact} companyId={company?.id ?? null} />
              </div>

              {/* Tipo */}
              <div className="space-y-1.5">
                <Label>Tipo <span className="text-destructive">*</span></Label>
                <div className="flex rounded-md border overflow-hidden">
                  {([
                    { value: 'llamada', label: '📞 Llamada' },
                    { value: 'visita',  label: '🏭 Visita' },
                  ] as { value: ActivityType; label: string }[]).map((opt, i, arr) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      className={[
                        'flex-1 py-2 text-sm font-medium transition-colors',
                        i < arr.length - 1 ? 'border-r' : '',
                        type === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-muted',
                      ].join(' ')}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div className="col-span-2 space-y-1.5">
                <Label>Título <span className="text-destructive">*</span></Label>
                <Input value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Llamada para seguimiento de oferta" />
              </div>

              {/* Descripción */}
              <div className="col-span-2 space-y-1.5">
                <Label>Descripción</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Detalles de la actividad…" rows={3} />
              </div>

              {/* Responsable */}
              <div className="col-span-2 space-y-1.5">
                <Label>Responsable</Label>
                <div className="flex gap-2 flex-wrap">
                  {RESPONSABLES.map(nombre => (
                    <button
                      key={nombre}
                      type="button"
                      onClick={() => setResponsable(responsable === nombre ? '' : nombre)}
                      className={[
                        'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                        responsable === nombre
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:bg-muted',
                      ].join(' ')}
                    >
                      {nombre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Próxima acción */}
              <div className="space-y-1.5">
                <Label>Próxima acción</Label>
                <Input value={nextAction} onChange={e => setNextAction(e.target.value)}
                  placeholder="Ej: Enviar oferta revisada" />
              </div>

              {/* Fecha próxima acción */}
              <div className="space-y-1.5">
                <Label>Fecha próxima acción</Label>
                <Input type="date" value={nextActionDate} onChange={e => setNextActionDate(e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setOpen(false) }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                {loading ? 'Guardando…' : 'Guardar actividad'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
