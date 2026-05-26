'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Upload, Search, X } from 'lucide-react'
import { CompanyFormDialog } from './CompanyForm'
import { CSVImportDialog } from './CSVImport'

interface CompaniesClientBarProps {
  provinces: string[]
  currentParams: {
    search?: string
    province?: string
    priority?: string
  }
}

export function CompaniesClientBar({ provinces, currentParams }: CompaniesClientBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(currentParams.search || '')
  const [province, setProvince] = useState(currentParams.province || '')
  const [priority, setPriority] = useState(currentParams.priority || '')

  const applyFilters = useCallback(
    (overrides?: { search?: string; province?: string; priority?: string }) => {
      const params = new URLSearchParams()
      const s = overrides?.search ?? search
      const prov = overrides?.province ?? province
      const pri = overrides?.priority ?? priority
      if (s) params.set('search', s)
      if (prov) params.set('province', prov)
      if (pri) params.set('priority', pri)
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`)
      })
    },
    [search, province, priority, pathname, router]
  )

  const clearFilters = () => {
    setSearch('')
    setProvince('')
    setPriority('')
    startTransition(() => router.push(pathname))
  }

  const hasFilters = !!(currentParams.search || currentParams.province || currentParams.priority)

  return (
    <div className="w-full space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* Province filter */}
        {provinces.length > 0 && (
          <select
            value={province}
            onChange={(e) => {
              setProvince(e.target.value)
              applyFilters({ province: e.target.value })
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Todas las provincias</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}

        {/* Priority filter */}
        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value)
            applyFilters({ priority: e.target.value })
          }}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Todas las prioridades</option>
          <option value="A">Prioridad A</option>
          <option value="B">Prioridad B</option>
          <option value="C">Prioridad C</option>
          <option value="D">Prioridad D</option>
        </select>

        <Button size="sm" onClick={() => applyFilters()} disabled={isPending}>
          <Search className="h-3.5 w-3.5 mr-1" />
          Buscar
        </Button>

        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            <X className="h-3.5 w-3.5 mr-1" />
            Limpiar
          </Button>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 ml-auto">
          <CSVImportDialog />
          <CompanyFormDialog
            trigger={
              <Button size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nueva empresa
              </Button>
            }
            onSuccess={() => {
              startTransition(() => router.refresh())
            }}
          />
        </div>
      </div>
    </div>
  )
}
