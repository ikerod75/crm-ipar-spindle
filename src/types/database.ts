export type UserRole = 'admin' | 'comercial' | 'tecnico'
export type CompanySegment = 'potencial' | 'activo' | 'recurrente'
export type CompanySize = 'micro' | 'pyme' | 'grande'
export type MachineType = 'torno' | 'centro_mecanizado' | 'fresadora' | 'rectificadora' | 'otro'
export type ServiceStatus = 'presupuesto' | 'en_curso' | 'finalizada'
export type ServiceType = 'reparacion' | 'venta_repuesto' | 'mantenimiento_preventivo' | 'urgencia'
export type ActivityType = 'llamada' | 'visita' | 'email' | 'whatsapp' | 'presupuesto' | 'nota'
export type ActivityOutcome = 'positivo' | 'neutral' | 'negativo' | 'sin_respuesta'
export type TaskPriority = 'alta' | 'media' | 'baja'
export type TaskStatus = 'pendiente' | 'completada' | 'cancelada'
export type CompanyPriority = 'A' | 'B' | 'C' | 'D'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  avatar_url: string | null
  active: boolean
  org_id: string
}

export interface Company {
  id: string
  org_id: string
  company_number: number | null
  name: string
  tax_id: string | null
  website: string | null
  address: string | null
  city: string | null
  province: string | null
  country: string
  segment: CompanySegment
  priority: CompanyPriority | null
  size: CompanySize | null
  sector: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  // computed/joined
  last_activity_date?: string | null
  total_revenue?: number
  open_tasks_count?: number
}

export interface Contact {
  id: string
  org_id: string
  company_id: string
  first_name: string
  last_name: string
  role: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  is_primary: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  company?: Pick<Company, 'id' | 'name'>
}

export interface Machine {
  id: string
  org_id: string
  company_id: string
  brand: string
  model: string | null
  serial_number: string | null
  machine_type: MachineType
  spindle_type: string | null
  notes: string | null
  created_at: string
  // joined
  company?: Pick<Company, 'id' | 'name'>
}

export interface ServiceOrder {
  id: string
  org_id: string
  company_id: string
  machine_id: string | null
  contact_id: string | null
  order_number: string
  title: string
  description: string | null
  status: ServiceStatus
  type: ServiceType
  amount: number | null
  cost_estimate: number | null
  received_date: string | null
  delivery_date: string | null
  completed_date: string | null
  assigned_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // joined
  company?: Pick<Company, 'id' | 'name'>
  machine?: Pick<Machine, 'id' | 'brand' | 'model'>
  contact?: Pick<Contact, 'id' | 'first_name' | 'last_name'>
  assignee?: Pick<Profile, 'id' | 'full_name'>
}

export interface Activity {
  id: string
  org_id: string
  company_id: string
  contact_id: string | null
  type: ActivityType
  title: string
  description: string | null
  outcome: ActivityOutcome | null
  next_action: string | null
  next_action_date: string | null
  created_by: string
  created_at: string
  // joined
  company?: Pick<Company, 'id' | 'name'>
  contact?: Pick<Contact, 'id' | 'first_name' | 'last_name'>
  creator?: Pick<Profile, 'id' | 'full_name'>
}

export interface Task {
  id: string
  org_id: string
  company_id: string | null
  contact_id: string | null
  title: string
  description: string | null
  due_date: string | null
  due_time: string | null
  priority: TaskPriority
  status: TaskStatus
  assigned_to: string
  created_by: string
  created_at: string
  updated_at: string
  // joined
  company?: Pick<Company, 'id' | 'name'>
  contact?: Pick<Contact, 'id' | 'first_name' | 'last_name'>
  assignee?: Pick<Profile, 'id' | 'full_name'>
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile }
      companies: { Row: Company }
      contacts: { Row: Contact }
      machines: { Row: Machine }
      service_orders: { Row: ServiceOrder }
      activities: { Row: Activity }
      tasks: { Row: Task }
    }
  }
}
