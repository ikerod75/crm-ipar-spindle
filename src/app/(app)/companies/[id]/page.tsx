import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CompanyDetailActions } from '@/components/companies/CompanyDetailActions'
import { ContactsManager } from '@/components/companies/ContactsManager'
import { CompanyFiles } from '@/components/companies/CompanyFiles'
import { OfertasTab } from '@/components/companies/OfertasTab'
import {
  Building2,
  Globe,
  MapPin,
  Wrench,
  ChevronLeft,
  CheckSquare,
  Calendar,
  Paperclip,
  FileText,
} from 'lucide-react'
import type {
  Company,
  Contact,
  Machine,
  ServiceOrder,
  Activity,
  Task,
  CompanyPriority,
} from '@/types/database'

export const dynamic = 'force-dynamic'


const activityIcon: Record<string, string> = {
  llamada: '📞',
  visita: '🏢',
  email: '📧',
  whatsapp: '💬',
  presupuesto: '📋',
  nota: '📝',
}

const outcomeColor: Record<string, string> = {
  positivo: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  negativo: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  sin_respuesta: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

const serviceStatusColor: Record<string, string> = {
  presupuesto: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  en_curso: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  finalizado: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelado: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

type ActivityWithJoins = Activity & {
  contact: Pick<Contact, 'id' | 'first_name' | 'last_name'> | null
  creator: { id: string; full_name: string } | null
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  const companyRes = await sb.from('companies').select('*').eq('id', id).single()
  if (!companyRes.data) notFound()
  const company = companyRes.data as Company

  const [contactsRes, machinesRes, serviceOrdersRes, activitiesRes, tasksRes] = await Promise.all([
    sb.from('contacts').select('*').eq('company_id', id).order('is_primary', { ascending: false }).order('first_name'),
    sb.from('machines').select('*').eq('company_id', id).order('brand'),
    sb.from('service_orders').select('*').eq('company_id', id).order('created_at', { ascending: false }),
    sb.from('activities').select('*, contact:contacts(id, first_name, last_name), creator:profiles(id, full_name)').eq('company_id', id).order('created_at', { ascending: false }),
    sb.from('tasks').select('*').eq('company_id', id).eq('status', 'pendiente').order('due_date', { ascending: true }),
  ])

  const contacts = (contactsRes.data ?? []) as Contact[]
  const machines = (machinesRes.data ?? []) as Machine[]
  const serviceOrders = (serviceOrdersRes.data ?? []) as ServiceOrder[]
  const activities = (activitiesRes.data ?? []) as ActivityWithJoins[]
  const tasks = (tasksRes.data ?? []) as Task[]

  const totalRevenue = serviceOrders
    .filter((o) => o.status === 'finalizada')
    .reduce((sum, o) => sum + (o.amount || 0), 0)

  const openOrdersCount = serviceOrders.filter(
    (o) => o.status === 'presupuesto' || o.status === 'en_curso'
  ).length

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/companies" className="hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" />
          Empresas
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{company.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{company.name}</h1>
              {company.priority && (
                <Badge className={`border-0 font-bold text-xs px-2 ${
                  company.priority === 'A' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                  company.priority === 'B' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                  company.priority === 'C' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  Prioridad {company.priority}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
              {company.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {company.city}
                  {company.province && `, ${company.province}`}
                </span>
              )}
              {company.sector && <span>· {company.sector}</span>}
              {company.size && <span>· {company.size}</span>}
            </div>
          </div>
        </div>

        <CompanyDetailActions companyId={id} company={company} />
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Actividades</p>
          <p className="text-2xl font-bold">{activities.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Tareas pendientes</p>
          <p className="text-2xl font-bold">{tasks.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Órdenes abiertas</p>
          <p className="text-2xl font-bold">{openOrdersCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Facturación total</p>
          <p className="text-xl font-bold">
            {totalRevenue.toLocaleString('es-ES', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            })}
          </p>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Company info card */}
        <Card className="lg:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {company.tax_id && (
              <div>
                <p className="text-xs text-muted-foreground">CIF / NIF</p>
                <p className="font-medium">{company.tax_id}</p>
              </div>
            )}
            {company.website && (
              <div>
                <p className="text-xs text-muted-foreground">Web</p>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {company.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
            {company.address && (
              <div>
                <p className="text-xs text-muted-foreground">Dirección</p>
                <p className="font-medium">
                  {company.address}
                  {company.city && `, ${company.city}`}
                  {company.province && ` (${company.province})`}
                </p>
              </div>
            )}
            {company.notes && (
              <div>
                <p className="text-xs text-muted-foreground">Notas</p>
                <p className="text-sm leading-relaxed">{company.notes}</p>
              </div>
            )}
            {company.priority && (
              <div>
                <p className="text-xs text-muted-foreground">Prioridad comercial</p>
                <p className="font-medium">
                  {company.priority === 'A' && 'A — Máxima'}
                  {company.priority === 'B' && 'B — Alta'}
                  {company.priority === 'C' && 'C — Media'}
                  {company.priority === 'D' && 'D — Baja'}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Creada</p>
              <p className="text-sm">
                {format(new Date(company.created_at), "d MMM yyyy", { locale: es })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="actividades">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="actividades">
                Actividades ({activities.length})
              </TabsTrigger>
              <TabsTrigger value="contactos">
                Contactos ({contacts.length})
              </TabsTrigger>
              <TabsTrigger value="tareas">
                Tareas ({tasks.length})
              </TabsTrigger>
              <TabsTrigger value="maquinas">
                Máquinas ({machines.length})
              </TabsTrigger>
              <TabsTrigger value="ordenes">
                Órdenes ({serviceOrders.length})
              </TabsTrigger>
              <TabsTrigger value="archivos" className="flex items-center gap-1">
                <Paperclip className="h-3.5 w-3.5" />
                Archivos
              </TabsTrigger>
              <TabsTrigger value="ofertas" className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                Ofertas
              </TabsTrigger>
            </TabsList>

            {/* Activities tab */}
            <TabsContent value="actividades" className="mt-4">
              <div className="space-y-3">
                {activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Sin actividades registradas.
                  </p>
                ) : (
                  activities.map((activity) => (
                    <div key={activity.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{activityIcon[activity.type] || '📌'}</span>
                          <div>
                            <p className="font-medium text-sm">{activity.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(activity.created_at), "d MMM yyyy 'a las' HH:mm", { locale: es })}
                              {activity.creator && ` · ${activity.creator.full_name}`}
                              {activity.contact &&
                                ` · ${activity.contact.first_name} ${activity.contact.last_name}`}
                            </p>
                          </div>
                        </div>
                        {activity.outcome && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                              outcomeColor[activity.outcome] || ''
                            }`}
                          >
                            {activity.outcome}
                          </span>
                        )}
                      </div>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground ml-8 leading-relaxed">
                          {activity.description}
                        </p>
                      )}
                      {activity.next_action && (
                        <div className="ml-8 flex items-center gap-2 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          <span className="text-primary font-medium">{activity.next_action}</span>
                          {activity.next_action_date && (
                            <span className="text-muted-foreground">
                              ·{' '}
                              {format(new Date(activity.next_action_date), 'd MMM yyyy', {
                                locale: es,
                              })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Tasks tab */}
            <TabsContent value="tareas" className="mt-4">
              <div className="space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Sin tareas pendientes.
                  </p>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-3 flex items-start gap-3">
                      <CheckSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                        )}
                        {task.due_date && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.due_date), 'd MMM yyyy', { locale: es })}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                          task.priority === 'alta'
                            ? 'bg-red-100 text-red-700'
                            : task.priority === 'media'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Contacts tab — managed client-side */}
            <TabsContent value="contactos" className="mt-4">
              <ContactsManager companyId={id} initialContacts={contacts} />
            </TabsContent>

            {/* Machines tab */}
            <TabsContent value="maquinas" className="mt-4">
              <div className="space-y-2">
                {machines.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Sin máquinas registradas.
                  </p>
                ) : (
                  machines.map((machine) => (
                    <div key={machine.id} className="border rounded-lg p-4 flex items-start gap-3">
                      <Wrench className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {machine.brand}
                          {machine.model && ` · ${machine.model}`}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                          <span className="capitalize">
                            {machine.machine_type.replace('_', ' ')}
                          </span>
                          {machine.serial_number && <span>S/N: {machine.serial_number}</span>}
                          {machine.spindle_type && <span>Husillo: {machine.spindle_type}</span>}
                        </div>
                        {machine.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{machine.notes}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Service orders tab */}
            <TabsContent value="ordenes" className="mt-4">
              <div className="space-y-2">
                {serviceOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Sin órdenes de servicio.
                  </p>
                ) : (
                  serviceOrders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{order.title}</p>
                          <p className="text-xs text-muted-foreground">
                            #{order.order_number} · {order.type.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {order.amount && (
                            <span className="text-sm font-semibold">
                              {order.amount.toLocaleString('es-ES', {
                                style: 'currency',
                                currency: 'EUR',
                                maximumFractionDigits: 0,
                              })}
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              serviceStatusColor[order.status] || ''
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                      {order.description && (
                        <p className="text-xs text-muted-foreground">{order.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'd MMM yyyy', { locale: es })}
                        {order.delivery_date &&
                          ` · Entrega: ${format(new Date(order.delivery_date), 'd MMM yyyy', {
                            locale: es,
                          })}`}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
            {/* Files tab */}
            <TabsContent value="archivos" className="mt-4">
              <CompanyFiles companyId={id} />
            </TabsContent>

            {/* Ofertas tab */}
            <TabsContent value="ofertas" className="mt-4">
              <OfertasTab companyId={id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
