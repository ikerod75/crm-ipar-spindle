'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus, Pencil, Trash2, Phone, Mail, Star, Loader2, AlertTriangle, User,
} from 'lucide-react'
import type { Contact } from '@/types/database'

interface ContactsManagerProps {
  companyId: string
  initialContacts: Contact[]
}

// ─── Contact form (shared for add + edit) ────────────────────────────────────
interface ContactFormData {
  first_name: string
  last_name: string
  role: string
  email: string
  phone: string
  mobile: string
  is_primary: boolean
  notes: string
}

const emptyForm: ContactFormData = {
  first_name: '', last_name: '', role: '', email: '',
  phone: '', mobile: '', is_primary: false, notes: '',
}

function toFormData(c: Contact): ContactFormData {
  return {
    first_name: c.first_name,
    last_name: c.last_name,
    role: c.role || '',
    email: c.email || '',
    phone: c.phone || '',
    mobile: c.mobile || '',
    is_primary: c.is_primary,
    notes: c.notes || '',
  }
}

interface ContactDialogProps {
  companyId: string
  contact?: Contact
  open: boolean
  onClose: () => void
  onSaved: () => void
}

function ContactDialog({ companyId, contact, open, onClose, onSaved }: ContactDialogProps) {
  const [form, setForm] = useState<ContactFormData>(contact ? toFormData(contact) : emptyForm)
  const [loading, setLoading] = useState(false)
  const isEdit = !!contact

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name.trim()) {
      toast.error('El nombre es obligatorio.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const payload = {
        company_id: companyId,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        role: form.role.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        mobile: form.mobile.trim() || null,
        is_primary: form.is_primary,
        notes: form.notes.trim() || null,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      let error

      if (isEdit && contact) {
        ;({ error } = await sb.from('contacts').update(payload).eq('id', contact.id))
      } else {
        ;({ error } = await sb.from('contacts').insert(payload))
      }

      if (error) throw error
      toast.success(isEdit ? 'Contacto actualizado.' : 'Contacto añadido.')
      onSaved()
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar contacto' : 'Nuevo contacto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name">Nombre <span className="text-destructive">*</span></Label>
              <Input id="first_name" name="first_name" value={form.first_name}
                onChange={handleChange} placeholder="Juan" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="last_name">Apellidos</Label>
              <Input id="last_name" name="last_name" value={form.last_name}
                onChange={handleChange} placeholder="García López" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="role">Cargo</Label>
              <Input id="role" name="role" value={form.role}
                onChange={handleChange} placeholder="Director técnico, Responsable compras…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={form.email}
                onChange={handleChange} placeholder="juan@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" type="tel" value={form.phone}
                onChange={handleChange} placeholder="+34 900 000 000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Móvil</Label>
              <Input id="mobile" name="mobile" type="tel" value={form.mobile}
                onChange={handleChange} placeholder="+34 600 000 000" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Checkbox
                id="is_primary"
                checked={form.is_primary}
                onCheckedChange={v => setForm(prev => ({ ...prev, is_primary: Boolean(v) }))}
              />
              <Label htmlFor="is_primary" className="cursor-pointer">Contacto principal</Label>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" name="notes" value={form.notes}
                onChange={handleChange} placeholder="Información adicional…" rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {loading ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Añadir contacto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Delete confirmation ──────────────────────────────────────────────────────
interface DeleteContactDialogProps {
  contact: Contact
  open: boolean
  onClose: () => void
  onDeleted: () => void
}

function DeleteContactDialog({ contact, open, onClose, onDeleted }: DeleteContactDialogProps) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('contacts').delete().eq('id', contact.id)
    setLoading(false)
    if (error) {
      toast.error('Error al eliminar: ' + error.message)
    } else {
      toast.success('Contacto eliminado.')
      onDeleted()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Eliminar contacto
          </DialogTitle>
          <DialogDescription>
            ¿Eliminar a{' '}
            <span className="font-semibold text-foreground">
              {contact.first_name} {contact.last_name}
            </span>
            ? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ContactsManager({ companyId, initialContacts }: ContactsManagerProps) {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)

  // Dialog state
  const [addOpen, setAddOpen] = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null)
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null)

  function refresh() {
    router.refresh()
    // Optimistically re-fetch contacts from server
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('contacts')
      .select('*')
      .eq('company_id', companyId)
      .order('is_primary', { ascending: false })
      .order('first_name')
      .then(({ data }: { data: Contact[] | null }) => {
        if (data) setContacts(data)
      })
  }

  async function handleSetPrimary(contactId: string) {
    setSettingPrimary(contactId)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    try {
      // Unset all primary for this company
      await sb.from('contacts').update({ is_primary: false }).eq('company_id', companyId)
      // Set selected as primary
      const { error } = await sb.from('contacts').update({ is_primary: true }).eq('id', contactId)
      if (error) throw error
      toast.success('Contacto principal actualizado.')
      refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar.')
    } finally {
      setSettingPrimary(null)
    }
  }

  // Sort: primary first
  const sorted = [...contacts].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return a.first_name.localeCompare(b.first_name)
  })

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {contacts.length} contacto{contacts.length !== 1 ? 's' : ''}
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Añadir contacto
        </Button>
      </div>

      {/* Contact cards */}
      {sorted.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin contactos. Añade el primero.</p>
        </div>
      ) : (
        sorted.map(contact => (
          <div
            key={contact.id}
            className={`border rounded-lg p-4 flex items-start gap-3 transition-colors ${
              contact.is_primary ? 'border-primary/30 bg-primary/5' : ''
            }`}
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
              {contact.first_name[0]?.toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {contact.first_name} {contact.last_name}
                </span>
                {contact.is_primary && (
                  <Badge className="bg-primary/10 text-primary border-0 text-xs py-0 px-1.5 gap-1">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    Principal
                  </Badge>
                )}
              </div>
              {contact.role && (
                <p className="text-xs text-muted-foreground">{contact.role}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-1">
                {contact.email && (
                  <a href={`mailto:${contact.email}`}
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {contact.email}
                  </a>
                )}
                {(contact.phone || contact.mobile) && (
                  <a href={`tel:${contact.phone || contact.mobile}`}
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {contact.phone || contact.mobile}
                  </a>
                )}
                {contact.phone && contact.mobile && (
                  <a href={`tel:${contact.mobile}`}
                    className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {contact.mobile}
                  </a>
                )}
              </div>
              {contact.notes && (
                <p className="text-xs text-muted-foreground mt-1 italic">{contact.notes}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {!contact.is_primary && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Establecer como principal"
                  disabled={settingPrimary === contact.id}
                  onClick={() => handleSetPrimary(contact.id)}
                  className="text-muted-foreground hover:text-primary"
                >
                  {settingPrimary === contact.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Star className="h-3.5 w-3.5" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                title="Editar"
                onClick={() => setEditContact(contact)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Eliminar"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteContact(contact)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))
      )}

      {/* Add dialog */}
      <ContactDialog
        companyId={companyId}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={refresh}
      />

      {/* Edit dialog */}
      {editContact && (
        <ContactDialog
          companyId={companyId}
          contact={editContact}
          open={!!editContact}
          onClose={() => setEditContact(null)}
          onSaved={refresh}
        />
      )}

      {/* Delete dialog */}
      {deleteContact && (
        <DeleteContactDialog
          contact={deleteContact}
          open={!!deleteContact}
          onClose={() => setDeleteContact(null)}
          onDeleted={refresh}
        />
      )}
    </div>
  )
}
