'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
import {
  Upload, Download, Trash2, FileText, FileImage, File,
  Loader2, AlertTriangle, FolderOpen,
} from 'lucide-react'

const BUCKET = 'company-files'

interface StorageFile {
  name: string
  id: string | undefined
  created_at: string | null
  metadata: {
    size?: number
    mimetype?: string
  } | null
}

function formatBytes(bytes: number | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function FileIcon({ mimetype }: { mimetype?: string }) {
  if (!mimetype) return <File className="h-4 w-4 text-muted-foreground" />
  if (mimetype.startsWith('image/')) return <FileImage className="h-4 w-4 text-blue-500" />
  if (mimetype === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />
  if (mimetype.includes('word') || mimetype.includes('document'))
    return <FileText className="h-4 w-4 text-blue-700" />
  if (mimetype.includes('sheet') || mimetype.includes('excel'))
    return <FileText className="h-4 w-4 text-green-600" />
  return <File className="h-4 w-4 text-muted-foreground" />
}

/** Display name: strip the timestamp prefix we add on upload */
function displayName(name: string): string {
  // Files uploaded as: "1234567890_originalname.pdf"
  const match = name.match(/^\d+_(.+)$/)
  return match ? match[1] : name
}

interface DeleteFileDialogProps {
  fileName: string
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

function DeleteFileDialog({ fileName, open, onClose, onConfirm }: DeleteFileDialogProps) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await onConfirm()
    setLoading(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Eliminar archivo
          </DialogTitle>
          <DialogDescription>
            ¿Eliminar <span className="font-semibold text-foreground break-all">{fileName}</span>?
            Esta acción no se puede deshacer.
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

export function CompanyFiles({ companyId }: { companyId: string }) {
  const [files, setFiles] = useState<StorageFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<StorageFile | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const folder = `companies/${companyId}`

  const loadFiles = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
      sortBy: { column: 'created_at', order: 'desc' },
    })
    if (error) {
      toast.error('Error al cargar archivos: ' + error.message)
    } else {
      // Filter out the placeholder file Supabase creates for empty folders
      setFiles((data ?? []).filter(f => f.name !== '.emptyFolderPlaceholder') as StorageFile[])
    }
    setLoading(false)
  }, [folder])

  useEffect(() => { loadFiles() }, [loadFiles])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Prefix with timestamp to avoid name collisions
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const path = `${folder}/${safeName}`

    setUploading(true)
    const supabase = createClient()
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    setUploading(false)

    if (error) {
      toast.error('Error al subir: ' + error.message)
    } else {
      toast.success(`"${file.name}" subido correctamente.`)
      loadFiles()
    }

    // Reset input so the same file can be re-uploaded if needed
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDownload(file: StorageFile) {
    setDownloadingId(file.name)
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .download(`${folder}/${file.name}`)

    setDownloadingId(null)

    if (error || !data) {
      toast.error('Error al descargar: ' + (error?.message ?? 'desconocido'))
      return
    }

    // Trigger browser download
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = displayName(file.name)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async function handleDelete(file: StorageFile) {
    const supabase = createClient()
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([`${folder}/${file.name}`])

    if (error) {
      toast.error('Error al eliminar: ' + error.message)
    } else {
      toast.success('Archivo eliminado.')
      loadFiles()
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? '…' : `${files.length} archivo${files.length !== 1 ? 's' : ''}`}
        </p>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleUpload}
            accept="*/*"
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Subiendo…</>
              : <><Upload className="h-3.5 w-3.5 mr-1" />Subir archivo</>}
          </Button>
        </div>
      </div>

      {/* File list */}
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 opacity-40" />
          <p className="text-sm">Cargando archivos…</p>
        </div>
      ) : files.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin archivos adjuntos.</p>
          <p className="text-xs mt-1">Usa el botón "Subir archivo" para adjuntar documentos.</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y overflow-hidden">
          {files.map(file => {
            const name = displayName(file.name)
            const isDownloading = downloadingId === file.name
            return (
              <div
                key={file.name}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
              >
                {/* Icon */}
                <FileIcon mimetype={file.metadata?.mimetype} />

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={name}>{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.metadata?.size)} · {formatDate(file.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Descargar"
                    disabled={isDownloading}
                    onClick={() => handleDownload(file)}
                  >
                    {isDownloading
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Download className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Eliminar"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(file)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <DeleteFileDialog
          fileName={displayName(deleteTarget.name)}
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </div>
  )
}
