'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'

interface DeleteCompanyButtonProps {
  companyId: string
  companyName: string
  /** Si true, redirige a /companies tras borrar (usado en el detalle) */
  redirectAfter?: boolean
  variant?: 'icon' | 'full'
}

export function DeleteCompanyButton({
  companyId,
  companyName,
  redirectAfter = false,
  variant = 'icon',
}: DeleteCompanyButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('companies').delete().eq('id', companyId)
      if (error) throw error

      toast.success(`"${companyName}" eliminada correctamente.`)
      setOpen(false)

      if (redirectAfter) {
        router.push('/companies')
      } else {
        router.refresh()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al eliminar la empresa.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {variant === 'icon' ? (
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={() => setOpen(true)}
          title="Eliminar empresa"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Eliminar empresa
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar empresa
            </DialogTitle>
            <DialogDescription className="pt-1">
              ¿Estás seguro de que quieres eliminar{' '}
              <span className="font-semibold text-foreground">&quot;{companyName}&quot;</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            Esta acción eliminará también todos los contactos, actividades, tareas y órdenes
            de servicio asociados a esta empresa. No se puede deshacer.
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {loading ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
