'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, Pencil } from 'lucide-react'
import { ActivityFormDialog } from './ActivityForm'
import { CompanyFormDialog } from './CompanyForm'
import { DeleteCompanyButton } from './DeleteCompanyButton'
import type { Company } from '@/types/database'

interface CompanyDetailActionsProps {
  companyId: string
  company: Company
}

export function CompanyDetailActions({ companyId, company }: CompanyDetailActionsProps) {
  const router = useRouter()

  return (
    <div className="flex flex-wrap items-center gap-2 shrink-0">
      <ActivityFormDialog
        companyId={companyId}
        trigger={
          <Button size="sm">
            <Plus className="h-3.5 w-3.5 mr-1" />
            Registrar actividad
          </Button>
        }
        onSuccess={() => router.refresh()}
      />
      <CompanyFormDialog
        company={company}
        trigger={
          <Button size="sm" variant="outline">
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Editar
          </Button>
        }
        onSuccess={() => router.refresh()}
      />
      <DeleteCompanyButton
        companyId={companyId}
        companyName={company.name}
        redirectAfter
        variant="full"
      />
    </div>
  )
}
