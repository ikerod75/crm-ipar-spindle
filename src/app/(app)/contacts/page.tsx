import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ContactForm } from '@/components/contacts/ContactForm'
import { ContactSearch } from '@/components/contacts/ContactSearch'
import { Users, Mail, Phone } from 'lucide-react'
import type { Contact } from '@/types/database'

type ContactRow = Contact & {
  company: { id: string; name: string } | null
}

export default async function ContactsPage() {
  const supabase = await createClient()

  const { data: contacts } = await supabase
    .from('contacts')
    .select('*, company:companies(id,name)')
    .order('first_name', { ascending: true })
    .range(0, 99)

  const rows = (contacts ?? []) as ContactRow[]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contactos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{rows.length} contactos</p>
        </div>
        <ContactForm />
      </div>

      <ContactSearch contacts={rows} />
    </div>
  )
}
