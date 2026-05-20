'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

async function getAdminSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !url) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada')
  }

  return createAdminClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function assertAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<{ role: string }>()

  if (profile?.role !== 'admin') throw new Error('Sin permisos de administrador')
}

export async function inviteUser(formData: FormData) {
  await assertAdmin()

  const email = formData.get('email') as string
  const fullName = formData.get('full_name') as string
  const role = formData.get('role') as string

  if (!email || !fullName || !role) {
    return { error: 'Todos los campos son obligatorios' }
  }

  try {
    const adminSupabase = await getAdminSupabase()

    const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role },
    })

    if (error) return { error: error.message }

    // Update the profile once created (the DB trigger should handle it, but just in case)
    if (data.user) {
      await adminSupabase
        .from('profiles')
        .update({ full_name: fullName, role })
        .eq('id', data.user.id)
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al invitar usuario'
    return { error: message }
  }
}

export async function toggleUserActive(userId: string, active: boolean) {
  await assertAdmin()

  const supabase = await createServerClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (supabase.from('profiles') as any)
  const { error } = await table
    .update({ active })
    .eq('id', userId)

  if (error) return { error: error.message }
  return { success: true }
}
