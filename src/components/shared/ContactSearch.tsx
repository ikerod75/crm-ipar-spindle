'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Search, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ContactOption {
  id: string
  first_name: string
  last_name: string
  company_id: string
}

interface ContactSearchProps {
  value: ContactOption | null
  onChange: (contact: ContactOption | null) => void
  companyId: string | null
  placeholder?: string
}

export function ContactSearch({ value, onChange, companyId, placeholder }: ContactSearchProps) {
  const [query, setQuery] = useState(
    value ? `${value.first_name} ${value.last_name}`.trim() : ''
  )
  const [results, setResults] = useState<ContactOption[]>([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevCompanyRef = useRef<string | null>(companyId)

  // Sync display when value is set externally (edit mode pre-fill)
  useEffect(() => {
    if (value) setQuery(`${value.first_name} ${value.last_name}`.trim())
    else setQuery('')
  }, [value])

  // Reset when company changes (but not on first mount)
  useEffect(() => {
    if (prevCompanyRef.current === companyId) return
    prevCompanyRef.current = companyId
    onChange(null)
    setQuery('')
    setResults([])
    setOpen(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  // Close on outside click
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
    const isScoped = !!companyId
    if (!isScoped && q.length < 2) { setResults([]); setOpen(false); return }
    setSearching(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let qb = (supabase as any)
      .from('contacts')
      .select('id,first_name,last_name,company_id')
      .order('first_name')
      .limit(10)
    if (isScoped) qb = qb.eq('company_id', companyId)
    if (q.length >= 2) qb = qb.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
    const { data } = await qb
    setResults((data as ContactOption[]) ?? [])
    setOpen(true)
    setSearching(false)
  }, [companyId])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (value) onChange(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 250)
  }

  function handleFocus() {
    if (companyId && results.length === 0 && !value) search('')
    else if (results.length > 0) setOpen(true)
  }

  function handleSelect(contact: ContactOption) {
    onChange(contact)
    setQuery(`${contact.first_name} ${contact.last_name}`.trim())
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

  const defaultPlaceholder = companyId
    ? 'Haz clic para ver contactos o escribe para filtrar…'
    : 'Escribe el nombre del contacto (mín. 2 caracteres)…'

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInput}
          onFocus={handleFocus}
          placeholder={placeholder ?? defaultPlaceholder}
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
            <ul className="max-h-48 overflow-y-auto py-1">
              {results.map(contact => (
                <li key={contact.id}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleSelect(contact)}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary text-xs font-semibold">
                      {contact.first_name[0]?.toUpperCase()}
                    </div>
                    {contact.first_name} {contact.last_name}
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
          Contacto: <span className="font-medium">{value.first_name} {value.last_name}</span>
        </p>
      )}
    </div>
  )
}
