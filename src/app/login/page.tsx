'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Cog } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [loading, setLoading]     = useState(false)
  const [isRecovery, setIsRecovery] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const router = useRouter()

  // Detect password recovery flow from URL hash
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Normal login ────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Credenciales incorrectas. Verifica tu email y contraseña.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  // ── Password reset ──────────────────────────────────────────────────────────
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== newPassword2) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast.error('Error al cambiar la contraseña: ' + error.message)
      setLoading(false)
      return
    }
    toast.success('Contraseña cambiada correctamente. Ahora puedes entrar.')
    setIsRecovery(false)
    setLoading(false)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-2">
            <Cog className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Ipar Spindle</h1>
          <p className="text-sm text-muted-foreground">Sistema de Gestión CRM</p>
        </div>

        {isRecovery ? (
          /* ── New password form ── */
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Nueva contraseña</CardTitle>
              <CardDescription>Introduce tu nueva contraseña para acceder al CRM</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password2">Repite la contraseña</Label>
                  <Input
                    id="new-password2"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword2}
                    onChange={e => setNewPassword2(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? 'Guardando...' : 'Guardar contraseña'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* ── Normal login form ── */
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Iniciar sesión</CardTitle>
              <CardDescription>Accede con tu cuenta corporativa</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@iparspindle.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? 'Accediendo...' : 'Entrar'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          ¿Sin acceso? Contacta con el administrador del sistema.
        </p>
      </div>
    </div>
  )
}
