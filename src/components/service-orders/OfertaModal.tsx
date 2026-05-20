'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { FileText, Plus, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { LineaVariable, OfertaDocData } from './OfertaPDF'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface OrderForOferta {
  id: string
  order_number: string
  company:  { id: string; name: string; address: string | null; city: string | null; province: string | null } | null
  contact:  { id: string; first_name: string; last_name: string; company_id: string } | null
  machine:  { id: string; brand: string; model: string | null; company_id: string } | null
}

interface OfertaModalProps {
  order: OrderForOferta
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0]
}
function calcImporte(l: LineaVariable) {
  return l.precio * l.qty * (1 - l.dto / 100)
}
function newId() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 6)
}

// ─── Component ────────────────────────────────────────────────────────────────
export function OfertaModal({ order }: OfertaModalProps) {
  const [open, setOpen]           = useState(false)
  const [generating, setGenerating] = useState(false)
  const [logoDataUrl, setLogoDataUrl] = useState('')

  // ── Form fields ──────────────────────────────────────────────────────────
  const [fecha,          setFecha]          = useState(today())
  const [direccion,      setDireccion]      = useState(order.company?.address ?? '')
  const [cpProvincia,    setCpProvincia]    = useState(
    [order.company?.city, order.company?.province].filter(Boolean).join(', ')
  )
  const [tipoCabezal,    setTipoCabezal]    = useState('')
  const [numSerie,       setNumSerie]       = useState('')
  const [modeloMaquina,  setModeloMaquina]  = useState(
    order.machine ? `${order.machine.brand} ${order.machine.model ?? ''}`.trim() : ''
  )
  const [numMaquina,     setNumMaquina]     = useState('')
  const [tipoCono,       setTipoCono]       = useState('')
  const [rpm,            setRpm]            = useState('')
  const [lubricacion,    setLubricacion]    = useState('')
  const [lineas,         setLineas]         = useState<LineaVariable[]>([
    { id: newId(), concepto: 'Precio reparación base', qty: 1, precio: 0, dto: 0 },
  ])
  const [plazoEntrega,   setPlazoEntrega]   = useState('10 DÍAS')
  const [formaPago,      setFormaPago]      = useState('Transferencia')
  const [domiciliacion,  setDomiciliacion]  = useState('ES37 0081 4362 64 0001346243')
  const [responsable,    setResponsable]    = useState('Iker Rodriguez')
  const [vencimiento,    setVencimiento]    = useState('Habituales con ustedes')

  // Load logo once when modal opens
  useEffect(() => {
    if (!open || logoDataUrl) return
    fetch('/Logos TRAZADAS-02.jpg')
      .then(r => r.blob())
      .then(blob => new Promise<string>((res, rej) => {
        const reader = new FileReader()
        reader.onload = e => res(e.target?.result as string)
        reader.onerror = rej
        reader.readAsDataURL(blob)
      }))
      .then(setLogoDataUrl)
      .catch(() => {/* logo optional */})
  }, [open, logoDataUrl])

  // ── Line helpers ─────────────────────────────────────────────────────────
  function addLinea() {
    setLineas(prev => [...prev, { id: newId(), concepto: '', qty: 1, precio: 0, dto: 0 }])
  }
  function updateLinea(id: string, field: keyof LineaVariable, value: string | number) {
    setLineas(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }
  function removeLinea(id: string) {
    setLineas(prev => prev.filter(l => l.id !== id))
  }

  // ── Totals ───────────────────────────────────────────────────────────────
  const baseImponible = lineas.reduce((s, l) => s + calcImporte(l), 0)
  const iva           = baseImponible * 0.21
  const total         = baseImponible + iva
  const fmtEur        = (n: number) =>
    new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

  // ── Generate + save ──────────────────────────────────────────────────────
  async function handleGenerate() {
    setGenerating(true)
    let blob: Blob | null = null
    let fileName = ''

    try {
      const { pdf }            = await import('@react-pdf/renderer')
      const { OfertaDocument } = await import('./OfertaPDF')

      const docData: OfertaDocData = {
        numOferta:     order.order_number,
        fecha,
        empresa:       order.company?.name ?? '',
        direccion,
        cpProvincia,
        contacto:      order.contact
          ? `${order.contact.first_name} ${order.contact.last_name}`.trim()
          : '',
        tipoCabezal, numSerie, modeloMaquina, numMaquina, tipoCono, rpm, lubricacion,
        lineas,
        baseImponible, iva, total,
        plazoEntrega, formaPago, domiciliacion, responsable, vencimiento,
        logoDataUrl,
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blob = await (pdf as any)(<OfertaDocument data={docData} />).toBlob()
      const safeName = (order.company?.name ?? 'cliente').replace(/[^a-zA-Z0-9À-ÿ]/g, '_')
      fileName = `Oferta_${order.order_number}_${safeName}.pdf`
    } catch (err) {
      console.error('[Oferta] PDF generation error:', err)
      toast.error('Error al generar el PDF')
      setGenerating(false)
      return
    }

    // 1 — Download locally (always, independent of Supabase)
    const localUrl = URL.createObjectURL(blob!)
    const a = document.createElement('a')
    a.href = localUrl
    a.download = fileName
    a.click()
    URL.revokeObjectURL(localUrl)
    toast.success('PDF descargado correctamente')

    // 2 — Save to Supabase (separate flow, shows its own toasts)
    await saveToSupabase(blob!, fileName)

    setOpen(false)
    setGenerating(false)
  }

  async function saveToSupabase(blob: Blob, fileName: string) {
    if (!order.company?.id) {
      toast.warning('Sin empresa vinculada — oferta no guardada en Supabase')
      return
    }

    const supabase = createClient()

    // ── Step 1: auth ─────────────────────────────────────────────────────
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData.user) {
      console.error('[Oferta] Auth error:', authError)
      toast.error('Error de autenticación — oferta no guardada')
      return
    }
    const userId = authData.user.id
    console.log('[Oferta] step 1 auth OK — userId:', userId)

    // ── Step 2: get org_id ───────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error: profileError } = await (supabase as any)
      .from('profiles')
      .select('org_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.org_id) {
      console.error('[Oferta] Profile error:', profileError)
      toast.error(`No se pudo obtener el perfil de usuario: ${profileError?.message ?? 'org_id vacío'}`)
      return
    }
    const orgId = profile.org_id
    console.log('[Oferta] step 2 org_id OK:', orgId)

    // ── Step 3: upload PDF to Storage ────────────────────────────────────
    let pdfPath: string | null = null
    const storagePath = `${order.company.id}/${Date.now()}_${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('offers')
      .upload(storagePath, blob, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      console.warn('[Oferta] Storage upload failed:', uploadError.message)
      // Not fatal — we still save the DB record, just without PDF link
      toast.warning(`Storage: ${uploadError.message} — el registro se guardará sin archivo`)
    } else {
      pdfPath = storagePath
      console.log('[Oferta] step 3 storage OK:', storagePath)
    }

    // ── Step 4: insert into offers table ─────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: insertError } = await (supabase as any)
      .from('offers')
      .insert({
        org_id:       orgId,
        company_id:   order.company.id,
        order_id:     order.id || null,
        offer_number: order.order_number,
        offer_date:   fecha,
        total_amount: total,
        pdf_path:     pdfPath,
        created_by:   userId,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[Oferta] DB insert error:', insertError)
      toast.error(
        `No se guardó en Supabase: ${insertError.message}. ` +
        '¿Has ejecutado la migración migration_offers.sql en el SQL Editor?'
      )
      return
    }

    console.log('[Oferta] step 4 insert OK — id:', inserted?.id)
    toast.success('Oferta guardada en la empresa ✓')
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} title="Generar oferta PDF">
        <FileText className="h-3.5 w-3.5 mr-1" />
        Oferta PDF
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Generar oferta — Orden {order.order_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-1">

            {/* ── Datos básicos ─────────────────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b pb-1.5">
                Datos básicos
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nº Oferta</Label>
                  <Input value={order.order_number} readOnly className="bg-muted font-mono" />
                </div>
                <div className="space-y-1">
                  <Label>Fecha</Label>
                  <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Empresa</Label>
                  <Input value={order.company?.name ?? ''} readOnly className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label>Att. (contacto)</Label>
                  <Input
                    value={order.contact
                      ? `${order.contact.first_name} ${order.contact.last_name}`.trim()
                      : ''}
                    readOnly className="bg-muted"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Dirección empresa</Label>
                  <Input value={direccion} onChange={e => setDireccion(e.target.value)}
                    placeholder="Calle, número…" />
                </div>
                <div className="space-y-1">
                  <Label>CP / Provincia</Label>
                  <Input value={cpProvincia} onChange={e => setCpProvincia(e.target.value)}
                    placeholder="48001, Bilbao" />
                </div>
              </div>
            </section>

            {/* ── Datos técnicos ────────────────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b pb-1.5">
                Datos técnicos del cabezal
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: 'Tipo de cabezal',         value: tipoCabezal,   set: setTipoCabezal },
                  { label: 'Nº de serie del cabezal', value: numSerie,      set: setNumSerie },
                  { label: 'Modelo de máquina',       value: modeloMaquina, set: setModeloMaquina },
                  { label: 'Nº de máquina',           value: numMaquina,    set: setNumMaquina },
                  { label: 'Tipo de cono',            value: tipoCono,      set: setTipoCono },
                  { label: 'RPM',                     value: rpm,           set: setRpm },
                ] as { label: string; value: string; set: (v: string) => void }[]).map(({ label, value, set }) => (
                  <div key={label} className="space-y-1">
                    <Label>{label}</Label>
                    <Input value={value} onChange={e => set(e.target.value)} />
                  </div>
                ))}
                <div className="col-span-2 space-y-1">
                  <Label>Lubricación</Label>
                  <Input value={lubricacion} onChange={e => setLubricacion(e.target.value)} />
                </div>
              </div>
            </section>

            {/* ── Líneas variables ──────────────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b pb-1.5">
                Líneas variables (precios)
              </h3>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Concepto</th>
                      <th className="text-center px-2 py-2 font-medium text-muted-foreground w-16">Qty</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Precio (€)</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground w-20">Dto. %</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Importe</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.map(l => (
                      <tr key={l.id} className="border-t hover:bg-muted/20">
                        <td className="px-3 py-1.5">
                          <Input
                            value={l.concepto}
                            onChange={e => updateLinea(l.id, 'concepto', e.target.value)}
                            className="h-7 text-sm"
                            placeholder="Descripción del trabajo…"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number" min="1"
                            value={l.qty}
                            onChange={e => updateLinea(l.id, 'qty', Number(e.target.value))}
                            className="h-7 text-sm text-center w-16"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number" min="0" step="0.01"
                            value={l.precio}
                            onChange={e => updateLinea(l.id, 'precio', Number(e.target.value))}
                            className="h-7 text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number" min="0" max="100"
                            value={l.dto}
                            onChange={e => updateLinea(l.id, 'dto', Number(e.target.value))}
                            className="h-7 text-sm text-right"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {fmtEur(calcImporte(l))} €
                        </td>
                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            onClick={() => removeLinea(l.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button type="button" variant="outline" size="sm" onClick={addLinea}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Añadir línea
              </Button>

              {/* Totales preview */}
              <div className="flex justify-end">
                <div className="min-w-[230px] border rounded-lg overflow-hidden text-sm">
                  {[
                    { label: 'Base Imponible', value: `${fmtEur(baseImponible)} €` },
                    { label: 'IVA 21%',         value: `${fmtEur(iva)} €` },
                    { label: 'Portes',          value: 'Pagados' },
                  ].map(({ label, value }) => (
                    <div key={label}
                      className="flex justify-between px-4 py-2 border-b text-muted-foreground">
                      <span>{label}</span>
                      <span className="font-mono">{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between px-4 py-2.5 font-semibold bg-primary text-primary-foreground">
                    <span>Total Factura</span>
                    <span className="font-mono">{fmtEur(total)} €</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Condiciones ───────────────────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest border-b pb-1.5">
                Condiciones
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { label: 'Plazo de entrega', value: plazoEntrega, set: setPlazoEntrega },
                  { label: 'Forma de pago',    value: formaPago,    set: setFormaPago },
                  { label: 'Responsable',      value: responsable,  set: setResponsable },
                  { label: 'Vencimiento',      value: vencimiento,  set: setVencimiento },
                ] as { label: string; value: string; set: (v: string) => void }[]).map(({ label, value, set }) => (
                  <div key={label} className="space-y-1">
                    <Label>{label}</Label>
                    <Input value={value} onChange={e => set(e.target.value)} />
                  </div>
                ))}
                <div className="col-span-2 space-y-1">
                  <Label>Domiciliación (IBAN)</Label>
                  <Input
                    value={domiciliacion}
                    onChange={e => setDomiciliacion(e.target.value)}
                    className="font-mono tracking-wide"
                  />
                </div>
              </div>
            </section>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating
                ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Generando PDF…</>
                : <><FileText className="h-3.5 w-3.5 mr-1" />Descargar PDF</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
