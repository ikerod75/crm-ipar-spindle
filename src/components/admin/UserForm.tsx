'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { inviteUser } from '@/app/actions/admin'
import { Plus, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function UserForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('comercial')

  function resetForm() {
    setEmail('')
    setFullName('')
    setRole('comercial')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email || !fullName || !role) {
      toast.error('Todos los campos son obligatorios')
      return
    }

    const formData = new FormData()
    formData.set('email', email)
    formData.set('full_name', fullName)
    formData.set('role', role)

    startTransition(async () => {
      const result = await inviteUser(formData)
      if (result?.error) {
        toast.error('Error: ' + result.error)
      } else {
        toast.success(`Invitación enviada a ${email}`)
        setOpen(false)
        resetForm()
        router.refresh()
      }
    })
  }

  return (
    <>
      <span className="contents" onClick={() => setOpen(true)}>
        <Button>
          <Plus className="h-4 w-4" />
          Crear usuario
        </Button>
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar usuario</DialogTitle>
            <DialogDescription>
              El usuario recibirá un email de invitación para configurar su contraseña.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md bg-blue-500/10 border border-blue-500/20 px-3 py-2 flex items-start gap-2">
              <Mail className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Se enviará un enlace de invitación por email. El usuario deberá aceptar la invitación para acceder al CRM.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Nombre completo *</Label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Juan García"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="juan@empresa.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Rol *</Label>
              <Select value={role} onValueChange={(v) => setRole(v ?? 'comercial')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { resetForm(); setOpen(false) }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Enviando invitación…' : 'Enviar invitación'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
