'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { ActivityType, ActivityOutcome, Contact } from '@/types/database'

interface ActivityFormData {
  type: ActivityType
  title: string
  description: string
  outcome: ActivityOutcome | ''
  next_action: string
  next_action_date: string
  contact_id: string
}

const defaultFormData: ActivityFormData = {
  type: 'llamada',
  title: '',
  description: '',
  outcome: '',
  next_action: '',
  next_action_date: '',
  contact_id: '',
}

interface ActivityFormDialogProps {
  companyId: string
  trigger: React.ReactNode
  onSuccess?: () => void
}

export function ActivityFormDialog({ companyId, trigger, onSuccess }: ActivityFormDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents cursor-pointer">
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar actividad</DialogTitle>
          </DialogHeader>
          <ActivityForm
            companyId={companyId}
            onSuccess={() => {
              setOpen(false)
              onSuccess?.()
            }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

interface ActivityFormProps {
  companyId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function ActivityForm({ companyId, onSuccess, onCancel }: ActivityFormProps) {
  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState<Pick<Contact, 'id' | 'first_name' | 'last_name'>[]>([])
  const [formData, setFormData] = useState<ActivityFormData>(defaultFormData)

  // Load contacts for this company
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('contacts')
      .select('id, first_name, last_name')
      .eq('company_id', companyId)
      .order('first_name')
      .then(({ data }) => {
        if (data) setContacts(data)
      })
  }, [companyId])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('El título de la actividad es obligatorio.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('No autenticado')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('activities').insert({
        company_id: companyId,
        contact_id: formData.contact_id || null,
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description || null,
        outcome: formData.outcome || null,
        next_action: formData.next_action || null,
        next_action_date: formData.next_action_date || null,
        created_by: user.id,
      })

      if (error) throw error

      toast.success('Actividad registrada correctamente.')
      setFormData(defaultFormData)
      onSuccess?.()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al registrar la actividad.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type + Contact */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="type">Tipo</Label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="llamada">📞 Llamada</option>
            <option value="visita">🏢 Visita</option>
            <option value="email">📧 Email</option>
            <option value="whatsapp">💬 WhatsApp</option>
            <option value="presupuesto">📋 Presupuesto</option>
            <option value="nota">📝 Nota</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact_id">Contacto</Label>
          <select
            id="contact_id"
            name="contact_id"
            value={formData.contact_id}
            onChange={handleChange}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Sin contacto</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">
          Título <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Resumen de la actividad"
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Detalles de la conversación, acuerdos, etc."
          rows={3}
        />
      </div>

      {/* Outcome */}
      <div className="space-y-1.5">
        <Label htmlFor="outcome">Resultado</Label>
        <select
          id="outcome"
          name="outcome"
          value={formData.outcome}
          onChange={handleChange}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Sin resultado</option>
          <option value="positivo">✅ Positivo</option>
          <option value="neutral">➡️ Neutral</option>
          <option value="negativo">❌ Negativo</option>
          <option value="sin_respuesta">⏳ Sin respuesta</option>
        </select>
      </div>

      {/* Next action */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="next_action">Próxima acción</Label>
          <Input
            id="next_action"
            name="next_action"
            value={formData.next_action}
            onChange={handleChange}
            placeholder="Llamar para confirmar..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="next_action_date">Fecha próxima acción</Label>
          <Input
            id="next_action_date"
            name="next_action_date"
            type="date"
            value={formData.next_action_date}
            onChange={handleChange}
          />
        </div>
      </div>

      <DialogFooter className="gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Registrar actividad'}
        </Button>
      </DialogFooter>
    </form>
  )
}
