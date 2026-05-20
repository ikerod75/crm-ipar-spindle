'use client'

import { useState } from 'react'
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
import type { Company, CompanySegment, CompanySize, CompanyPriority } from '@/types/database'

interface CompanyFormData {
  name: string
  tax_id: string
  website: string
  address: string
  city: string
  province: string
  country: string
  segment: CompanySegment
  priority: CompanyPriority | ''
  size: CompanySize | ''
  sector: string
  notes: string
}

const defaultFormData: CompanyFormData = {
  name: '',
  tax_id: '',
  website: '',
  address: '',
  city: '',
  province: '',
  country: 'España',
  segment: 'potencial',
  priority: '',
  size: '',
  sector: '',
  notes: '',
}

interface CompanyFormDialogProps {
  company?: Partial<Company>
  trigger: React.ReactNode
  onSuccess?: (company: Company) => void
}

export function CompanyFormDialog({ company, trigger, onSuccess }: CompanyFormDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <span onClick={() => setOpen(true)} className="contents cursor-pointer">
        {trigger}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{company?.id ? 'Editar empresa' : 'Nueva empresa'}</DialogTitle>
          </DialogHeader>
          <CompanyForm
            company={company}
            onSuccess={(c) => {
              setOpen(false)
              onSuccess?.(c)
            }}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}

interface CompanyFormProps {
  company?: Partial<Company>
  onSuccess?: (company: Company) => void
  onCancel?: () => void
}

export function CompanyForm({ company, onSuccess, onCancel }: CompanyFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CompanyFormData>({
    name: company?.name || '',
    tax_id: company?.tax_id || '',
    website: company?.website || '',
    address: company?.address || '',
    city: company?.city || '',
    province: company?.province || '',
    country: company?.country || 'España',
    segment: company?.segment || 'potencial',
    priority: company?.priority || '',
    size: company?.size || '',
    sector: company?.sector || '',
    notes: company?.notes || '',
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('El nombre de la empresa es obligatorio.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const payload = {
        name: formData.name.trim(),
        tax_id: formData.tax_id || null,
        website: formData.website || null,
        address: formData.address || null,
        city: formData.city || null,
        province: formData.province || null,
        country: formData.country || 'España',
        segment: formData.segment,
        priority: formData.priority || null,
        size: formData.size || null,
        sector: formData.sector || null,
        notes: formData.notes || null,
        ...(company?.id ? { updated_at: new Date().toISOString() } : { created_by: user?.id }),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let result: any
      if (company?.id) {
        result = await (supabase as any)
          .from('companies')
          .update(payload)
          .eq('id', company.id)
          .select()
          .single()
      } else {
        result = await (supabase as any)
          .from('companies')
          .insert(payload)
          .select()
          .single()
      }

      if (result.error) throw result.error

      toast.success(company?.id ? 'Empresa actualizada.' : 'Empresa creada correctamente.')
      onSuccess?.(result.data as Company)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar la empresa.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Row 1: Name + Tax ID */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2 sm:col-span-1">
          <Label htmlFor="name">
            Nombre <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Nombre de la empresa"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tax_id">CIF / NIF</Label>
          <Input
            id="tax_id"
            name="tax_id"
            value={formData.tax_id}
            onChange={handleChange}
            placeholder="B12345678"
          />
        </div>
      </div>

      {/* Row 2: Website */}
      <div className="space-y-1.5">
        <Label htmlFor="website">Sitio web</Label>
        <Input
          id="website"
          name="website"
          type="url"
          value={formData.website}
          onChange={handleChange}
          placeholder="https://www.empresa.com"
        />
      </div>

      {/* Row 3: Address */}
      <div className="space-y-1.5">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Calle, número..."
        />
      </div>

      {/* Row 4: City + Province + Country */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="city">Ciudad</Label>
          <Input
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="Bilbao"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="province">Provincia</Label>
          <Input
            id="province"
            name="province"
            value={formData.province}
            onChange={handleChange}
            placeholder="Bizkaia"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country">País</Label>
          <Input
            id="country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            placeholder="España"
          />
        </div>
      </div>

      {/* Row 5: Segment + Priority + Size */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="segment">Segmento</Label>
          <select
            id="segment"
            name="segment"
            value={formData.segment}
            onChange={handleChange}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="potencial">Potencial</option>
            <option value="activo">Activo</option>
            <option value="recurrente">Recurrente</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priority">Prioridad</Label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Sin prioridad</option>
            <option value="A">A — Máxima</option>
            <option value="B">B — Alta</option>
            <option value="C">C — Media</option>
            <option value="D">D — Baja</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="size">Tamaño</Label>
          <select
            id="size"
            name="size"
            value={formData.size}
            onChange={handleChange}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Sin especificar</option>
            <option value="micro">Micro</option>
            <option value="pyme">PYME</option>
            <option value="grande">Grande</option>
          </select>
        </div>
      </div>

      {/* Row 6: Sector */}
      <div className="space-y-1.5">
        <Label htmlFor="sector">Sector</Label>
        <Input
          id="sector"
          name="sector"
          value={formData.sector}
          onChange={handleChange}
          placeholder="Automoción, Aeronáutica..."
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Información adicional..."
          rows={3}
        />
      </div>

      <DialogFooter className="gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : company?.id ? 'Guardar cambios' : 'Crear empresa'}
        </Button>
      </DialogFooter>
    </form>
  )
}
