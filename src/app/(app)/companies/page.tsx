import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Building2, Eye } from 'lucide-react'
import { CompaniesClientBar } from '@/components/companies/CompaniesClientBar'
import { DeleteCompanyButton } from '@/components/companies/DeleteCompanyButton'
import type { CompanyPriority } from '@/types/database'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

type CompanyRow = {
  id: string
  company_number: number | null
  name: string
  address: string | null
  city: string | null
  province: string | null
  priority: CompanyPriority | null
}

type PrimaryContact = {
  company_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  mobile: string | null
}

interface SearchParams {
  search?: string
  province?: string
  priority?: string
  page?: string
}

const priorityColors: Record<string, string> = {
  A: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  B: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  C: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  D: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

function PriorityBadge({ priority }: { priority: CompanyPriority | null }) {
  if (!priority) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${priorityColors[priority]}`}>
      {priority}
    </span>
  )
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const page = parseInt(params.page || '1', 10)
  const offset = (page - 1) * PAGE_SIZE

  // Build query — include company_number and address
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('companies')
    .select('id, company_number, name, address, city, province, priority', { count: 'exact' })
    .order('company_number', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1)

  if (params.search) {
    query = query.ilike('name', `%${params.search}%`)
  }
  if (params.province) {
    query = query.ilike('province', `%${params.province}%`)
  }
  if (params.priority && ['A', 'B', 'C', 'D'].includes(params.priority)) {
    query = query.eq('priority', params.priority)
  }

  const { data: rawCompanies, count } = await query
  const companies = (rawCompanies ?? []) as CompanyRow[]
  const companyIds = companies.map((c) => c.id)

  // Fetch primary contacts for all companies in this page
  const primaryContactsRes = companyIds.length > 0
    ? await supabase
        .from('contacts')
        .select('company_id, first_name, last_name, email, phone, mobile')
        .in('company_id', companyIds)
        .eq('is_primary', true)
    : { data: [] as PrimaryContact[] }

  const primaryContactMap: Record<string, PrimaryContact> = {}
  for (const c of ((primaryContactsRes.data ?? []) as PrimaryContact[])) {
    primaryContactMap[c.company_id] = c
  }

  // Get distinct provinces for filter
  const { data: rawProvinces } = await supabase
    .from('companies')
    .select('province')
    .not('province', 'is', null)
    .order('province')

  const distinctProvinces = Array.from(
    new Set(
      ((rawProvinces ?? []) as { province: string | null }[])
        .map((p) => p.province)
        .filter(Boolean)
    )
  ) as string[]

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Empresas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {count ?? 0} empresas registradas
          </p>
        </div>
      </div>

      {/* Filters + action buttons */}
      <CompaniesClientBar provinces={distinctProvinces} currentParams={params} />

      {/* Table */}
      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground w-14">#</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground min-w-[180px]">Empresa</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground min-w-[150px] hidden md:table-cell">Contacto principal</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden lg:table-cell">Teléfono</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden xl:table-cell">Email</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden xl:table-cell">Dirección</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden lg:table-cell">Población</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground hidden md:table-cell">Provincia</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground w-14">Prior.</th>
                <th className="text-right px-3 py-3 font-medium text-muted-foreground w-20">Acc.</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    No se encontraron empresas con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                companies.map((company) => {
                  const contact = primaryContactMap[company.id]
                  const phone = contact?.phone || contact?.mobile
                  return (
                    <tr key={company.id} className="hover:bg-muted/30 transition-colors">
                      {/* # */}
                      <td className="px-3 py-2.5 text-muted-foreground text-xs font-mono">
                        {company.company_number ?? '—'}
                      </td>

                      {/* Empresa */}
                      <td className="px-3 py-2.5">
                        <Link
                          href={`/companies/${company.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {company.name}
                        </Link>
                      </td>

                      {/* Contacto principal */}
                      <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">
                        {contact
                          ? `${contact.first_name} ${contact.last_name}`.trim()
                          : <span className="text-xs italic">Sin contacto</span>}
                      </td>

                      {/* Teléfono */}
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        {phone ? (
                          <a href={`tel:${phone}`} className="text-primary hover:underline text-xs">
                            {phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="px-3 py-2.5 hidden xl:table-cell max-w-[180px]">
                        {contact?.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-primary hover:underline text-xs truncate block"
                            title={contact.email}
                          >
                            {contact.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Dirección */}
                      <td className="px-3 py-2.5 text-muted-foreground text-xs hidden xl:table-cell max-w-[200px]">
                        <span className="truncate block" title={company.address ?? ''}>
                          {company.address || '—'}
                        </span>
                      </td>

                      {/* Población */}
                      <td className="px-3 py-2.5 text-muted-foreground text-xs hidden lg:table-cell">
                        {company.city || '—'}
                      </td>

                      {/* Provincia */}
                      <td className="px-3 py-2.5 text-muted-foreground text-xs hidden md:table-cell">
                        {company.province || '—'}
                      </td>

                      {/* Priority */}
                      <td className="px-3 py-2.5 text-center">
                        <PriorityBadge priority={company.priority} />
                      </td>

                      {/* Acciones */}
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Link href={`/companies/${company.id}`}>
                            <Button variant="ghost" size="icon-sm">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <DeleteCompanyButton
                            companyId={company.id}
                            companyName={company.name}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Mostrando {offset + 1}–{Math.min(offset + PAGE_SIZE, count || 0)} de {count}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/companies?${new URLSearchParams({ ...params, page: String(page - 1) })}`}>
                  <Button variant="outline" size="sm">Anterior</Button>
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/companies?${new URLSearchParams({ ...params, page: String(page + 1) })}`}>
                  <Button variant="outline" size="sm">Siguiente</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
