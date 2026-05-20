'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Company { id: string; name: string }

export function ContactForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])

  const [companyId, setCompanyId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [mobile, setMobile] = useState('')
  const [isPrimary, setIsPrimary] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.from('companies').select('id,name').order('name').then(({ data }) => {
      setCompanies((data as Company[]) ?? [])
    })
  }, [open])

  function resetForm() {
    setCompanyId('')
    setFirstName('')
    setLastName('')
    setRole('')
    setEmail('')
    setPhone('')
    setMobile('')
    setIsPrimary(false)
    setNotes('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) { toast.error('Selecciona una empresa'); return }
    if (!firstName.trim()) { toast.error('El nombre es obligatorio'); return }

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from('contacts').insert({
      company_id: companyId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      role: role.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      mobile: mobile.trim() || null,
      is_primary: isPrimary,
      notes: notes.trim() || null,
    } as any)

    setLoading(false)
    if (error) {
      toast.error('Error al crear el contacto: ' + error.message)
    } else {
      toast.success('Contacto creado correctamente')
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
          Nuevo contacto
        </Button>
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo contacto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Empresa *</Label>
                <Select value={companyId} onValueChange={(v) => setCompanyId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empresa…" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Juan"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Apellidos</Label>
                <Input
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="García López"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Cargo</Label>
                <Input
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="Ej: Director técnico"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="juan@empresa.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+34 900 000 000"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Móvil</Label>
                <Input
                  type="tel"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  placeholder="+34 600 000 000"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  checked={isPrimary}
                  onCheckedChange={(v) => setIsPrimary(Boolean(v))}
                  id="is-primary"
                />
                <Label htmlFor="is-primary" className="cursor-pointer">Contacto principal</Label>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Notas</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Información adicional…"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setOpen(false) }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando…' : 'Crear contacto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
