import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { UserForm } from '@/components/admin/UserForm'
import { ToggleUserActive } from '@/components/admin/ToggleUserActive'
import { Users, ShieldCheck } from 'lucide-react'
import type { Profile, UserRole } from '@/types/database'

const roleLabel: Record<UserRole, string> = {
  admin: 'Admin',
  comercial: 'Comercial',
  tecnico: 'Técnico',
}

const roleClass: Record<UserRole, string> = {
  admin: 'bg-purple-500/10 text-purple-700 ring-purple-500/20 dark:text-purple-400',
  comercial: 'bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-400',
  tecnico: 'bg-orange-500/10 text-orange-700 ring-orange-500/20 dark:text-orange-400',
}

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (currentProfile?.role !== 'admin') redirect('/dashboard')

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true })

  const rows = (profiles ?? []) as Profile[]
  const activeCount = rows.filter(p => p.active).length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestión de usuarios</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {activeCount} usuarios activos de {rows.length} totales
            </p>
          </div>
        </div>
        <UserForm />
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No hay usuarios registrados</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Estado</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((profile, idx) => (
                <tr
                  key={profile.id}
                  className={`border-b last:border-0 ${idx % 2 === 0 ? '' : 'bg-muted/20'}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {profile.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                      </div>
                      <span className="font-medium">{profile.full_name}</span>
                      {profile.id === user.id && (
                        <span className="text-xs text-muted-foreground">(tú)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{profile.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${roleClass[profile.role]}`}>
                      {roleLabel[profile.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      profile.active
                        ? 'bg-green-500/10 text-green-700 ring-green-500/20 dark:text-green-400'
                        : 'bg-gray-500/10 text-gray-600 ring-gray-500/20'
                    }`}>
                      {profile.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ToggleUserActive
                      userId={profile.id}
                      active={profile.active}
                      isSelf={profile.id === user.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
        <p className="text-sm text-yellow-700 dark:text-yellow-400">
          <strong>Nota:</strong> La creación de usuarios requiere la clave de servicio de Supabase
          (<code className="text-xs bg-yellow-500/10 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>)
          configurada como variable de entorno en el servidor. Si no está configurada, la invitación fallará.
        </p>
      </div>
    </div>
  )
}
