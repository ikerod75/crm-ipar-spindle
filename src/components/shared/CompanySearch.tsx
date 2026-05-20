'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Search, X, Loader2, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CompanyOption { id: string; name: string }

interface CompanySearchProps {
  value: CompanyOption | null
  onChange: (company: CompanyOption | null) => void
  placeholder?: string
}

export function CompanySearch({ value, onChange, placeholder }: CompanySearchProps) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [results, setResults] = useState<CompanyOption[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sync display when value is set externally (edit mode pre-fill)
  useEffect(() => {
    if (value) setQuery(value.name)
    else setQuery('')
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setSearching(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('companies').select('id,name').ilike('name', `%${q}%`).order('name').limit(8)
    setResults((data as CompanyOption[]) ?? [])
    setOpen(true)
    setSearching(false)
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (value) onChange(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 250)
  }

  function handleSelect(company: CompanyOption) {
    onChange(company)
    setQuery(company.name)
    setOpen(false)
    setResults([])
  }

  function handleClear() {
    onChange(null)
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInput}
          onFocus={() => query.length >= 2 && results.length > 0 && setOpen(true)}
          placeholder={placeholder ?? 'Escribe el nombre de la empresa…'}
          className={cn('pl-8 pr-8', value && 'border-primary bg-primary/5 font-medium')}
          autoComplete="off"
        />
        {searching && <Loader2 className="absolute right-3 h-3.5 w-3.5 text-muted-foreground animate-spin" />}
        {!searching && (value || query) && (
          <button type="button" onClick={handleClear}
            className="absolute right-3 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg overflow-hidden">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground text-center">No se encontraron resultados</p>
          ) : (
            <ul className="max-h-52 overflow-y-auto py-1">
              {results.map(company => (
                <li key={company.id}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleSelect(company)}
                  >
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {company.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {value && (
        <p className="text-xs text-primary mt-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
          Empresa: <span className="font-medium">{value.name}</span>
        </p>
      )}
    </div>
  )
}
