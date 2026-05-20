# Ipar Spindle CRM

Sistema de gestión de clientes (CRM) para Ipar Spindle — especialistas en reparación de cabezales y electromandrinos de máquinas CNC.

## Stack tecnológico

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend / Base de datos:** Supabase (PostgreSQL + Auth + RLS)
- **Hosting recomendado:** Vercel (free tier)
- **Autenticación:** Supabase Auth (email + contraseña)

## Módulos incluidos

| Módulo | Descripción |
|--------|-------------|
| Dashboard | KPIs, facturación, próximas acciones, alertas |
| Empresas | CRUD completo, importación CSV, búsqueda full-text |
| Contactos | Asociados a empresa, click-to-call/email |
| Actividades | Log comercial con "próxima acción" obligatoria |
| Órdenes de servicio | Flujo presupuesto → en curso → finalizado |
| Tareas | Recordatorios con prioridad y asignación |
| Informes | Segmentos, actividad comercial, clientes en riesgo |
| Admin | Gestión de usuarios y roles |

## Roles de usuario

| Rol | Permisos |
|-----|----------|
| `admin` | Acceso total a todo |
| `comercial` | CRUD empresas, contactos, actividades, tareas. Solo lectura en órdenes |
| `tecnico` | Lectura empresas/contactos/máquinas. R/W en órdenes asignadas a él |

---

## Setup — Guía paso a paso

### 1. Clonar y configurar variables de entorno

```bash
git clone <tu-repo>
cd crm-ipar-spindle
npm install
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase
```

### 2. Configurar Supabase

#### 2.1 Crear proyecto en Supabase

1. Ve a https://supabase.com y crea un nuevo proyecto
2. Elige región: **eu-west-1** (Ireland) para clientes en España
3. Anota la URL y las claves API (Project Settings → API)

#### 2.2 Ejecutar el schema de base de datos

En el **SQL Editor** de Supabase, ejecuta en orden:

1. Contenido de `supabase/schema.sql` (tablas + triggers)
2. Contenido de `supabase/rls.sql` (políticas RLS)

> Ejecuta schema.sql primero y rls.sql después.

#### 2.3 Configurar autenticación

En **Supabase Dashboard → Authentication → Settings**:
- Desactiva "Email Confirmations" para desarrollo (actívalo en producción)

#### 2.4 Crear el primer usuario admin

En **Supabase → Authentication → Users**, crea un usuario. Luego en SQL Editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'tu@email.com';
```

### 3. Variables de entorno

Edita `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

> SUPABASE_SERVICE_ROLE_KEY es necesaria para invitar usuarios desde el panel admin.
> Nunca la expongas en el cliente (sin prefijo NEXT_PUBLIC_ está solo en servidor).

### 4. Ejecutar en desarrollo

```bash
npm run dev
# Abre http://localhost:3000
```

### 5. Desplegar en Vercel

Conecta tu repo de GitHub en vercel.com y despliega automáticamente.
Añade las variables de entorno en Vercel → Settings → Environment Variables.

**Dominio personalizado:** añade `crm.iparspindle.com` en Vercel → Domains y configura
un CNAME en tu DNS apuntando a `cname.vercel-dns.com`.

---

## Importación masiva de clientes (CSV)

La app incluye un importador CSV en el módulo de Empresas.

Formato del CSV:
```csv
name,tax_id,city,province,sector,segment,notes
"Mecánica Precision SL","B12345678","Bilbao","Bizkaia","automoción","potencial",""
```

Columnas: `name` (obligatorio), `tax_id`, `website`, `address`, `city`, `province`, `country`, `segment`, `size`, `sector`, `notes`

Valores para `segment`: `potencial` | `activo` | `recurrente`
Valores para `size`: `micro` | `pyme` | `grande`

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (app)/          # Rutas protegidas (requieren login)
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── companies/[id]/
│   │   ├── contacts/
│   │   ├── activities/
│   │   ├── service-orders/
│   │   ├── tasks/
│   │   ├── reports/
│   │   └── admin/users/
│   ├── login/
│   └── layout.tsx
├── components/
│   ├── layout/         # Sidebar, AppShell, ThemeProvider
│   ├── dashboard/
│   ├── companies/
│   ├── contacts/
│   ├── activities/
│   ├── service-orders/
│   ├── tasks/
│   └── admin/
├── lib/supabase/
│   ├── client.ts       # Cliente para componentes cliente
│   └── server.ts       # Cliente para server components
└── types/database.ts

supabase/
├── schema.sql          # Tablas, triggers, sequences
└── rls.sql             # Políticas de Row Level Security
```

---

## Seguridad

- Row Level Security (RLS) activado en todas las tablas
- Los usuarios solo ven datos de su organización (org_id)
- SUPABASE_SERVICE_ROLE_KEY solo en Server Actions (nunca en cliente)
- Sin registro público — el admin crea usuarios manualmente
- Sesión persistente vía cookies httpOnly (Supabase SSR)

## Comandos de desarrollo

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run lint     # ESLint
```
