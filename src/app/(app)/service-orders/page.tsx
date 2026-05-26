export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ServiceOrderForm } from '@/components/service-orders/ServiceOrderForm'
import { ServiceOrdersTable } from '@/components/service-orders/ServiceOrdersTable'
import { Wrench } from 'lucide-react'
import type { ServiceOrder, ServiceStatus, ServiceType } from '@/types/database'

type ServiceOrderRow = ServiceOrder & {
  company: { id: string; name: string; address: string | null; city: string | null; province: string | null } | null
  assignee: { id: string; full_name: string } | null
  machine: { id: string; brand: string; model: string | null; company_id: string } | null
  contact: { id: string; first_name: string; last_name: string; company_id: string } | null
}

export default async function ServiceOrdersPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('service_orders')
    .select('*, company:companies(id,name,address,city,province), assignee:profiles!assigned_to(id,full_name), machine:machines(id,brand,model,company_id), contact:contacts(id,first_name,last_name,company_id)')
    .order('created_at', { ascending: false })
    .range(0, 49)

  const rows = (orders ?? []) as ServiceOrderRow[]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Órdenes de servicio</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{rows.length} órdenes recientes</p>
        </div>
        <ServiceOrderForm />
      </div>

      <ServiceOrdersTable orders={rows} />
    </div>
  )
}
