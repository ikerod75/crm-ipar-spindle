-- ============================================================
-- IPAR SPINDLE CRM — Schema Supabase
-- Ejecutar en orden en el SQL Editor de Supabase
-- ============================================================

-- Extensión para UUIDs
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. ORGANIZATIONS (multi-tenant preparado)
-- ============================================================
create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);

-- Organización por defecto para Ipar Spindle
insert into organizations (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Ipar Spindle')
on conflict do nothing;

-- ============================================================
-- 2. PROFILES (extiende auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) default '00000000-0000-0000-0000-000000000001',
  full_name text not null,
  email text not null,
  role text not null check (role in ('admin', 'comercial', 'tecnico')) default 'comercial',
  avatar_url text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Trigger: crear perfil automáticamente al crear usuario en Auth
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, org_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    '00000000-0000-0000-0000-000000000001'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- 3. COMPANIES
-- ============================================================
create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) not null default '00000000-0000-0000-0000-000000000001',
  name text not null,
  tax_id text,
  website text,
  address text,
  city text,
  province text,
  country text not null default 'ES',
  segment text not null check (segment in ('potencial', 'activo', 'recurrente')) default 'potencial',
  size text check (size in ('micro', 'pyme', 'grande')),
  sector text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references profiles(id)
);

create index if not exists idx_companies_org on companies(org_id);
create index if not exists idx_companies_segment on companies(segment);
create index if not exists idx_companies_name on companies using gin(to_tsvector('spanish', name));

-- ============================================================
-- 4. CONTACTS
-- ============================================================
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) not null default '00000000-0000-0000-0000-000000000001',
  company_id uuid references companies(id) on delete cascade not null,
  first_name text not null,
  last_name text not null default '',
  role text,
  email text,
  phone text,
  mobile text,
  is_primary boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_contacts_company on contacts(company_id);
create index if not exists idx_contacts_org on contacts(org_id);

-- ============================================================
-- 5. MACHINES
-- ============================================================
create table if not exists machines (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) not null default '00000000-0000-0000-0000-000000000001',
  company_id uuid references companies(id) on delete cascade not null,
  brand text not null,
  model text,
  serial_number text,
  machine_type text not null check (machine_type in ('torno', 'centro_mecanizado', 'fresadora', 'rectificadora', 'otro')) default 'otro',
  spindle_type text,
  notes text,
  created_at timestamptz default now()
);

create index if not exists idx_machines_company on machines(company_id);

-- ============================================================
-- 6. SERVICE ORDERS
-- ============================================================
create sequence if not exists service_order_seq start 1000;

create table if not exists service_orders (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) not null default '00000000-0000-0000-0000-000000000001',
  company_id uuid references companies(id) not null,
  machine_id uuid references machines(id),
  contact_id uuid references contacts(id),
  order_number text not null unique default ('OS-' || lpad(nextval('service_order_seq')::text, 5, '0')),
  title text not null,
  description text,
  status text not null check (status in ('presupuesto', 'en_curso', 'finalizado', 'cancelado')) default 'presupuesto',
  type text not null check (type in ('reparacion', 'venta_repuesto', 'mantenimiento_preventivo', 'urgencia')) default 'reparacion',
  amount numeric(12,2),
  cost_estimate numeric(12,2),
  received_date date,
  delivery_date date,
  completed_date date,
  assigned_to uuid references profiles(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_service_orders_company on service_orders(company_id);
create index if not exists idx_service_orders_status on service_orders(status);
create index if not exists idx_service_orders_assigned on service_orders(assigned_to);

-- ============================================================
-- 7. ACTIVITIES
-- ============================================================
create table if not exists activities (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) not null default '00000000-0000-0000-0000-000000000001',
  company_id uuid references companies(id) not null,
  contact_id uuid references contacts(id),
  type text not null check (type in ('llamada', 'visita', 'email', 'whatsapp', 'presupuesto', 'nota')),
  title text not null,
  description text,
  outcome text check (outcome in ('positivo', 'neutral', 'negativo', 'sin_respuesta')),
  next_action text,
  next_action_date date,
  created_by uuid references profiles(id) not null,
  created_at timestamptz default now()
);

create index if not exists idx_activities_company on activities(company_id);
create index if not exists idx_activities_next_action_date on activities(next_action_date);
create index if not exists idx_activities_created_by on activities(created_by);

-- ============================================================
-- 8. TASKS
-- ============================================================
create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid references organizations(id) not null default '00000000-0000-0000-0000-000000000001',
  company_id uuid references companies(id),
  contact_id uuid references contacts(id),
  title text not null,
  description text,
  due_date date,
  due_time time,
  priority text not null check (priority in ('alta', 'media', 'baja')) default 'media',
  status text not null check (status in ('pendiente', 'completada', 'cancelada')) default 'pendiente',
  assigned_to uuid references profiles(id) not null,
  created_by uuid references profiles(id) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tasks_assigned on tasks(assigned_to);
create index if not exists idx_tasks_due_date on tasks(due_date);
create index if not exists idx_tasks_status on tasks(status);

-- ============================================================
-- 9. UPDATED_AT TRIGGERS
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_updated_at before update on companies
  for each row execute procedure update_updated_at();

create trigger contacts_updated_at before update on contacts
  for each row execute procedure update_updated_at();

create trigger service_orders_updated_at before update on service_orders
  for each row execute procedure update_updated_at();

create trigger tasks_updated_at before update on tasks
  for each row execute procedure update_updated_at();
