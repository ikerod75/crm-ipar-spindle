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
import type { TaskPriority } from '@/types/database'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Company { id: string; name: string }
interface Profile { id: string; full_name: string }

export function TaskForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<Profile[]>([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('media')
  const [assignedTo, setAssignedTo] = useState('')

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.from('companies').select('id,name').order('name').then(({ data }) => {
      setCompanies((data as Company[]) ?? [])
    })
    supabase.from('profiles').select('id,full_name').eq('active', true).order('full_name').then(({ data }) => {
      setUsers((data as Profile[]) ?? [])
    })
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !assignedTo) setAssignedTo(user.id)
    })
  }, [open])

  function resetForm() {
    setTitle('')
    setDescription('')
    setCompanyId('')
    setDueDate('')
    setDueTime('')
    setPriority('media')
    setAssignedTo('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { toast.error('El título es obligatorio'); return }
    if (!assignedTo) { toast.error('Asigna la tarea a un usuario'); return }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('No autenticado'); setLoading(false); return }

    const { error } = await supabase.from('tasks').insert({
      title: title.trim(),
      description: description.trim() || null,
      company_id: companyId || null,
      due_date: dueDate || null,
      due_time: dueTime || null,
      priority,
      status: 'pendiente' as const,
      assigned_to: assignedTo,
      created_by: user.id,
    } as any)

    setLoading(false)
    if (error) {
      toast.error('Error al crear la tarea: ' + error.message)
    } else {
      toast.success('Tarea creada correctamente')
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
          Nueva tarea
        </Button>
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Título *</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Llamar al cliente para confirmar entrega"
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Descripción</Label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Detalles adicionales…"
                  rows={2}
                />
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Empresa</Label>
                <Select value={companyId} onValueChange={(v) => setCompanyId(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Empresa asociada (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin empresa</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Fecha límite</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={dueTime}
                  onChange={e => setDueTime(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Prioridad</Label>
                <Select value={priority} onValueChange={(v) => setPriority((v ?? 'media') as TaskPriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Asignar a *</Label>
                <Select value={assignedTo} onValueChange={(v) => setAssignedTo(v ?? '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar usuario…" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setOpen(false) }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando…' : 'Crear tarea'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
