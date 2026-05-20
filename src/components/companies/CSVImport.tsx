'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
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
import { Upload, FileText, AlertCircle, Users } from 'lucide-react'
import type { CompanySegment, CompanyPriority } from '@/types/database'

interface CSVRow {
  name?: string
  tax_id?: string
  city?: string
  province?: string
  sector?: string
  segment?: string
  priority?: string
  notes?: string
  // Columnas de contacto
  contacto?: string
  contact_name?: string
  nombre_contacto?: string
  email?: string
  email_contacto?: string
  telefono?: string
  phone?: string
  telefono_contacto?: string
  cargo?: string
  role?: string
  [key: string]: string | undefined
}

interface ParsedCompany {
  name: string
  tax_id: string | null
  city: string | null
  province: string | null
  sector: string | null
  segment: CompanySegment
  priority: CompanyPriority | null
  notes: string | null
  // contact data (optional)
  _contactName: string | null
  _contactEmail: string | null
  _contactPhone: string | null
  _contactRole: string | null
}

const VALID_SEGMENTS: CompanySegment[] = ['potencial', 'activo', 'recurrente']
const VALID_PRIORITIES: CompanyPriority[] = ['A', 'B', 'C', 'D']

function normalizeSegment(val: string | undefined): CompanySegment {
  const lower = (val || '').toLowerCase().trim()
  if (VALID_SEGMENTS.includes(lower as CompanySegment)) return lower as CompanySegment
  return 'potencial'
}

function normalizePriority(val: string | undefined): CompanyPriority | null {
  const upper = (val || '').toUpperCase().trim()
  if (VALID_PRIORITIES.includes(upper as CompanyPriority)) return upper as CompanyPriority
  return null
}

/** Extrae el nombre del contacto de varias posibles columnas */
function extractContactName(row: CSVRow): string | null {
  return (
    row.contacto?.trim() ||
    row.contact_name?.trim() ||
    row.nombre_contacto?.trim() ||
    null
  )
}

function extractEmail(row: CSVRow): string | null {
  return row.email?.trim() || row.email_contacto?.trim() || null
}

function extractPhone(row: CSVRow): string | null {
  return row.telefono?.trim() || row.phone?.trim() || row.telefono_contacto?.trim() || null
}

function extractRole(row: CSVRow): string | null {
  return row.cargo?.trim() || row.role?.trim() || null
}

export function CSVImportDialog() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-3.5 w-3.5 mr-1" />
        Importar CSV
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importar empresas desde CSV</DialogTitle>
            <DialogDescription>
              Columnas de empresa: <strong>name</strong> (obligatorio), tax_id, city, province, sector, segment, priority, notes.
              <br />
              Columnas de contacto (opcionales): <strong>contacto</strong>, <strong>email</strong>, <strong>telefono</strong>, cargo.
              Si se incluyen, se creará un contacto principal para cada empresa.
            </DialogDescription>
          </DialogHeader>
          <CSVImportForm onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

function CSVImportForm({ onClose }: { onClose: () => void }) {
  const [parsedRows, setParsedRows] = useState<ParsedCompany[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasContacts = parsedRows.some((r) => r._contactName || r._contactEmail || r._contactPhone)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setErrors([])
    setParsedRows([])

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const errs: string[] = []
        const rows: ParsedCompany[] = []

        results.data.forEach((row, idx) => {
          const name = (row.name || row.Name || row.NOMBRE || row.nombre || '').trim()
          if (!name) {
            errs.push(`Fila ${idx + 2}: falta el campo "name".`)
            return
          }

          const contactName = extractContactName(row)
          const contactEmail = extractEmail(row)
          const contactPhone = extractPhone(row)

          rows.push({
            name,
            tax_id: row.tax_id?.trim() || null,
            city: row.city?.trim() || null,
            province: row.province?.trim() || null,
            sector: row.sector?.trim() || null,
            segment: normalizeSegment(row.segment),
            priority: normalizePriority(row.priority),
            notes: row.notes?.trim() || null,
            _contactName: contactName,
            _contactEmail: contactEmail,
            _contactPhone: contactPhone,
            _contactRole: extractRole(row),
          })
        })

        if (errs.length > 0) setErrors(errs)
        setParsedRows(rows)
      },
      error: (err) => {
        setErrors([`Error al procesar el CSV: ${err.message}`])
      },
    })
  }

  async function handleImport() {
    if (parsedRows.length === 0) return
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const CHUNK = 100
      let insertedCompanies = 0
      let insertedContacts = 0

      for (let i = 0; i < parsedRows.length; i += CHUNK) {
        const chunk = parsedRows.slice(i, i + CHUNK)

        // 1. Insert companies
        const companyPayloads = chunk.map((row) => ({
          name: row.name,
          tax_id: row.tax_id,
          city: row.city,
          province: row.province,
          sector: row.sector,
          segment: row.segment,
          priority: row.priority,
          notes: row.notes,
          country: 'España',
          created_by: user?.id,
        }))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: insertedData, error: companyError } = await (supabase as any)
          .from('companies')
          .insert(companyPayloads)
          .select('id, name')

        if (companyError) throw companyError
        insertedCompanies += insertedData.length

        // 2. Insert contacts for rows that have contact data
        const contactPayloads: object[] = []
        insertedData.forEach((company: { id: string; name: string }, idx: number) => {
          const row = chunk[idx]
          if (!row) return
          if (!row._contactName && !row._contactEmail && !row._contactPhone) return

          // Split name into first/last
          const fullName = row._contactName || ''
          const parts = fullName.trim().split(/\s+/)
          const first_name = parts[0] || 'Contacto'
          const last_name = parts.slice(1).join(' ') || ''

          contactPayloads.push({
            company_id: company.id,
            first_name,
            last_name,
            email: row._contactEmail,
            phone: row._contactPhone,
            role: row._contactRole,
            is_primary: true,
          })
        })

        if (contactPayloads.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: contactData, error: contactError } = await (supabase as any)
            .from('contacts')
            .insert(contactPayloads)
            .select('id')

          if (contactError) throw contactError
          insertedContacts += contactData.length
        }
      }

      const msg = insertedContacts > 0
        ? `${insertedCompanies} empresas y ${insertedContacts} contactos importados correctamente.`
        : `${insertedCompanies} empresas importadas correctamente.`

      toast.success(msg)
      onClose()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al importar.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const preview = parsedRows.slice(0, 5)
  const remaining = parsedRows.length - preview.length
  const contactCount = parsedRows.filter((r) => r._contactName || r._contactEmail || r._contactPhone).length

  return (
    <div className="space-y-4">
      {/* File upload area */}
      <div
        className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">
          {fileName ? fileName : 'Haz clic para seleccionar un archivo CSV'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Formato: UTF-8, separador coma
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 space-y-1">
          <div className="flex items-center gap-2 text-destructive text-sm font-medium">
            <AlertCircle className="h-4 w-4" />
            {errors.length} error{errors.length > 1 ? 'es' : ''} encontrado{errors.length > 1 ? 's' : ''}
          </div>
          {errors.slice(0, 5).map((e, i) => (
            <p key={i} className="text-xs text-destructive ml-6">{e}</p>
          ))}
        </div>
      )}

      {/* Contact detection notice */}
      {hasContacts && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
          <Users className="h-4 w-4 shrink-0" />
          Se detectaron datos de contacto en {contactCount} fila{contactCount !== 1 ? 's' : ''}.
          Se crearán contactos principales automáticamente.
        </div>
      )}

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Vista previa — {parsedRows.length} empresa{parsedRows.length !== 1 ? 's' : ''} detectada{parsedRows.length !== 1 ? 's' : ''}
          </p>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Nombre</th>
                    <th className="px-3 py-2 text-left font-medium">CIF</th>
                    <th className="px-3 py-2 text-left font-medium">Ciudad</th>
                    <th className="px-3 py-2 text-left font-medium">Segmento</th>
                    <th className="px-3 py-2 text-left font-medium">Prior.</th>
                    {hasContacts && <th className="px-3 py-2 text-left font-medium">Contacto</th>}
                    {hasContacts && <th className="px-3 py-2 text-left font-medium">Email / Tlf</th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium max-w-[140px] truncate">{row.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.tax_id || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.city || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          row.segment === 'activo'
                            ? 'bg-green-100 text-green-800'
                            : row.segment === 'recurrente'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {row.segment}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {row.priority ? (
                          <span className="font-bold text-xs">{row.priority}</span>
                        ) : '—'}
                      </td>
                      {hasContacts && (
                        <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate">
                          {row._contactName || '—'}
                        </td>
                      )}
                      {hasContacts && (
                        <td className="px-3 py-2 text-muted-foreground max-w-[140px] truncate">
                          {row._contactEmail || row._contactPhone || '—'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {remaining > 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground border-t bg-muted/20">
                ... y {remaining} empresa{remaining !== 1 ? 's' : ''} más
              </p>
            )}
          </div>
        </div>
      )}

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleImport}
          disabled={parsedRows.length === 0 || loading}
        >
          {loading
            ? 'Importando...'
            : `Importar ${parsedRows.length} empresa${parsedRows.length !== 1 ? 's' : ''}${hasContacts ? ` + ${contactCount} contacto${contactCount !== 1 ? 's' : ''}` : ''}`}
        </Button>
      </DialogFooter>
    </div>
  )
}
