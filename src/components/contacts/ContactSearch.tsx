'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Users } from 'lucide-react'
import type { Contact } from '@/types/database'

type ContactRow = Contact & {
  company: { id: string; name: string } | null
}

export function ContactSearch({ contacts }: { contacts: ContactRow[] }) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? contacts.filter(c => {
        const q = query.toLowerCase()
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase()
        return (
          fullName.includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.company?.name.toLowerCase().includes(q) ||
          c.role?.toLowerCase().includes(q)
        )
      })
    : contacts

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email, empresa…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No se encontraron contactos</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cargo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Teléfono</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Móvil</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact, idx) => (
                <tr
                  key={contact.id}
                  className={`border-b last:border-0 hover:bg-accent/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}
                >
                  <td className="px-4 py-3 font-medium">
                    {contact.first_name} {contact.last_name}
                  </td>
                  <td className="px-4 py-3">
                    {contact.company ? (
                      <Link
                        href={`/companies/${contact.company.id}`}
                        className="text-primary hover:underline"
                      >
                        {contact.company.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {contact.role || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-primary hover:underline text-xs"
                      >
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {contact.phone ? (
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-xs hover:underline"
                      >
                        {contact.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {contact.mobile ? (
                      <a
                        href={`tel:${contact.mobile}`}
                        className="text-xs hover:underline"
                      >
                        {contact.mobile}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {contact.is_primary && (
                      <Badge variant="default" className="text-xs">Principal</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
