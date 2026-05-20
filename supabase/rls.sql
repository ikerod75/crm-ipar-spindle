-- ============================================================
-- IPAR SPINDLE CRM — Row Level Security Policies
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

-- Helper: obtener org_id del usuario actual
create or replace function auth_org_id()
returns uuid language sql stable security definer as $$
  select org_id from profiles where id = auth.uid()
$$;

-- Helper: obtener rol del usuario actual
create or replace function auth_role()
returns text language sql stable security definer as $$
  select role from profiles where id = auth.uid()
$$;

-- ============================================================
-- PROFILES
-- ============================================================
alter table profiles enable row level security;

create policy "profiles_select" on profiles for select
  using (org_id = auth_org_id());

create policy "profiles_update_own" on profiles for update
  using (id = auth.uid());

create policy "profiles_admin_all" on profiles for all
  using (auth_role() = 'admin');

-- ============================================================
-- COMPANIES
-- ============================================================
alter table companies enable row level security;

create policy "companies_select" on companies for select
  using (org_id = auth_org_id());

create policy "companies_insert" on companies for insert
  with check (org_id = auth_org_id() and auth_role() in ('admin', 'comercial'));

create policy "companies_update" on companies for update
  using (org_id = auth_org_id() and auth_role() in ('admin', 'comercial'));

create policy "companies_delete" on companies for delete
  using (org_id = auth_org_id() and auth_role() = 'admin');

-- ============================================================
-- CONTACTS
-- ============================================================
alter table contacts enable row level security;

create policy "contacts_select" on contacts for select
  using (org_id = auth_org_id());

create policy "contacts_insert" on contacts for insert
  with check (org_id = auth_org_id() and auth_role() in ('admin', 'comercial'));

create policy "contacts_update" on contacts for update
  using (org_id = auth_org_id() and auth_role() in ('admin', 'comercial'));

create policy "contacts_delete" on contacts for delete
  using (org_id = auth_org_id() and auth_role() = 'admin');

-- ============================================================
-- MACHINES
-- ============================================================
alter table machines enable row level security;

create policy "machines_select" on machines for select
  using (org_id = auth_org_id());

create policy "machines_insert" on machines for insert
  with check (org_id = auth_org_id() and auth_role() in ('admin', 'comercial', 'tecnico'));

create policy "machines_update" on machines for update
  using (org_id = auth_org_id() and auth_role() in ('admin', 'comercial', 'tecnico'));

create policy "machines_delete" on machines for delete
  using (org_id = auth_org_id() and auth_role() = 'admin');

-- ============================================================
-- SERVICE ORDERS
-- ============================================================
alter table service_orders enable row level security;

create policy "service_orders_select" on service_orders for select
  using (org_id = auth_org_id());

create policy "service_orders_insert" on service_orders for insert
  with check (org_id = auth_org_id() and auth_role() in ('admin', 'tecnico'));

-- Técnico: solo sus propias órdenes; admin/comercial: todas
create policy "service_orders_update" on service_orders for update
  using (
    org_id = auth_org_id() and (
      auth_role() = 'admin' or
      (auth_role() = 'tecnico' and assigned_to = auth.uid())
    )
  );

create policy "service_orders_delete" on service_orders for delete
  using (org_id = auth_org_id() and auth_role() = 'admin');

-- ============================================================
-- ACTIVITIES
-- ============================================================
alter table activities enable row level security;

create policy "activities_select" on activities for select
  using (org_id = auth_org_id());

create policy "activities_insert" on activities for insert
  with check (org_id = auth_org_id() and auth_role() in ('admin', 'comercial'));

create policy "activities_update" on activities for update
  using (org_id = auth_org_id() and auth_role() in ('admin', 'comercial'));

create policy "activities_delete" on activities for delete
  using (org_id = auth_org_id() and auth_role() = 'admin');

-- ============================================================
-- TASKS
-- ============================================================
alter table tasks enable row level security;

create policy "tasks_select" on tasks for select
  using (org_id = auth_org_id());

create policy "tasks_insert" on tasks for insert
  with check (org_id = auth_org_id());

create policy "tasks_update" on tasks for update
  using (org_id = auth_org_id());

create policy "tasks_delete" on tasks for delete
  using (org_id = auth_org_id() and auth_role() = 'admin');

-- ============================================================
-- ORGANIZATIONS (solo admin puede ver/editar)
-- ============================================================
alter table organizations enable row level security;

create policy "orgs_select" on organizations for select
  using (id = auth_org_id());
