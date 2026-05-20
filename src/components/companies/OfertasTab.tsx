'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, Eye, FileText, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Offer {
  id: string
  offer_number: string
  offer_date: string
  order_id: string | null
  total_amount: number | null
  pdf_path: string | null
  created_at: string
  // joined
  order: { order_number: string } | null
}

interface OfertasTabProps {
  companyId: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtEur(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)
}

function fmtDate(d: string) {
  try { return format(parseISO(d), "d MMM yyyy", { locale: es }) } catch { return d }
}

// ─── Component ────────────────────────────────────────────────────────────────
export function OfertasTab({ companyId }: OfertasTabProps) {
  const [offers, setOffers]         = useState<Offer[]>([])
  const [loading, setLoading]       = useState(true)
  const [detail, setDetail]         = useState<Offer | null>(null)
  const [pdfLoading, setPdfLoading] = useState<string | null>(null) // offer id
  const [toDelete, setToDelete]     = useState<Offer | null>(null)
  const [deleting, setDeleting]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('offers')
      .select('id, offer_number, offer_date, order_id, total_amount, pdf_path, created_at, order:service_orders(order_number)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    setOffers((data as Offer[]) ?? [])
    setLoading(false)
  }, [companyId])

  useEffect(() => { load() }, [load])

  // ── Delete offer ─────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!toDelete) return
    setDeleting(true)
    const supabase = createClient()

    // Remove PDF from Storage if it exists
    if (toDelete.pdf_path) {
      const { error: storageError } = await supabase.storage
        .from('offers')
        .remove([toDelete.pdf_path])
      if (storageError) console.warn('Storage remove failed:', storageError.message)
    }

    // Delete DB record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('offers')
      .delete()
      .eq('id', toDelete.id)

    setDeleting(false)
    if (error) {
      toast.error('Error al eliminar la oferta: ' + error.message)
    } else {
      toast.success(`Oferta ${toDelete.offer_number} eliminada`)
      setToDelete(null)
      setOffers(prev => prev.filter(o => o.id !== toDelete.id))
    }
  }

  // ── Get signed URL for a PDF ─────────────────────────────────────────────
  async function getSignedUrl(pdfPath: string): Promise<string | null> {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from('offers')
      .createSignedUrl(pdfPath, 3600) // 1 hour
    if (error || !data?.signedUrl) {
      toast.error('No se pudo acceder al PDF')
      return null
    }
    return data.signedUrl
  }

  // ── Download PDF ─────────────────────────────────────────────────────────
  async function handleDownload(offer: Offer) {
    if (!offer.pdf_path) { toast.error('PDF no disponible'); return }
    setPdfLoading(offer.id)
    const url = await getSignedUrl(offer.pdf_path)
    if (url) {
      const a = document.createElement('a')
      a.href = url
      a.download = `Oferta_${offer.offer_number}.pdf`
      a.click()
    }
    setPdfLoading(null)
  }

  // ── View PDF in new tab ──────────────────────────────────────────────────
  async function handleView(offer: Offer) {
    if (!offer.pdf_path) { toast.error('PDF no disponible'); return }
    setPdfLoading(offer.id)
    const url = await getSignedUrl(offer.pdf_path)
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
    setPdfLoading(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (offers.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No hay ofertas generadas para esta empresa.</p>
        <p className="text-xs mt-1">
          Usa el botón "Oferta PDF" en una Orden de Servicio para generar y guardar ofertas.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Nº Oferta</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Fecha</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Nº Orden</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Importe</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {offers.map((offer, idx) => (
              <tr
                key={offer.id}
                className={`border-b last:border-0 hover:bg-accent/30 transition-colors ${idx % 2 === 1 ? 'bg-muted/20' : ''}`}
              >
                <td className="px-4 py-3 font-mono text-xs font-medium">
                  {offer.offer_number}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                  {fmtDate(offer.offer_date)}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                  {offer.order?.order_number ?? '—'}
                </td>
                <td className="px-4 py-3 text-right font-semibold">
                  {fmtEur(offer.total_amount)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 justify-end">
                    <Button
                      variant="ghost" size="icon-sm"
                      title="Ver PDF"
                      disabled={pdfLoading === offer.id || !offer.pdf_path}
                      onClick={() => handleView(offer)}
                    >
                      {pdfLoading === offer.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Eye className="h-3.5 w-3.5" />
                      }
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm"
                      title="Descargar PDF"
                      disabled={pdfLoading === offer.id || !offer.pdf_path}
                      onClick={() => handleDownload(offer)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm"
                      title="Ver detalle"
                      onClick={() => setDetail(offer)}
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm"
                      title="Eliminar oferta"
                      onClick={() => setToDelete(offer)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* ── Delete confirm dialog ─────────────────────────────────────── */}
      <Dialog open={!!toDelete} onOpenChange={v => { if (!v) setToDelete(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Eliminar oferta
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Seguro que quieres eliminar la oferta{' '}
            <span className="font-semibold text-foreground font-mono">
              {toDelete?.offer_number}
            </span>
            {' '}del{' '}
            <span className="font-semibold text-foreground">
              {toDelete ? fmtDate(toDelete.offer_date) : ''}
            </span>
            ? Se eliminará también el PDF guardado. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting
                ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Eliminando…</>
                : <><Trash2 className="h-3.5 w-3.5 mr-1" />Eliminar</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={v => { if (!v) setDetail(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Oferta {detail?.offer_number}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              {[
                { label: 'Nº Oferta',          value: detail.offer_number },
                { label: 'Fecha',              value: fmtDate(detail.offer_date) },
                { label: 'Orden de servicio',  value: detail.order?.order_number ?? '—' },
                { label: 'Importe total',      value: fmtEur(detail.total_amount) },
                { label: 'Generada el',        value: fmtDate(detail.created_at) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1.5 border-b last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1" variant="outline"
                  disabled={!detail.pdf_path || pdfLoading === detail.id}
                  onClick={() => handleView(detail)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Ver PDF
                </Button>
                <Button
                  className="flex-1"
                  disabled={!detail.pdf_path || pdfLoading === detail.id}
                  onClick={() => handleDownload(detail)}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Descargar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
