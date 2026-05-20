'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Image from 'next/image'
import {
  LayoutDashboard, Building2, Wrench, Activity, CheckSquare,
  BarChart3, Settings, LogOut, ChevronLeft, Moon, Sun
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useTheme } from 'next-themes'
import type { Profile } from '@/types/database'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles?: string[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/companies', label: 'Empresas', icon: Building2 },
  { href: '/activities', label: 'Actividades', icon: Activity },
  { href: '/service-orders', label: 'Órdenes servicio', icon: Wrench },
  { href: '/tasks', label: 'Tareas', icon: CheckSquare },
  { href: '/reports', label: 'Informes', icon: BarChart3 },
]

const adminItems: NavItem[] = [
  { href: '/admin/users', label: 'Usuarios', icon: Settings, roles: ['admin'] },
]

interface SidebarProps {
  profile: Profile | null
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ profile, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Sesión cerrada')
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 bg-card border-r flex flex-col z-50 transition-transform duration-300',
        'lg:static lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-3 py-4 border-b bg-white dark:bg-white">
          <Link href="/dashboard" onClick={onClose} className="flex-1 min-w-0">
            <Image
              src="/Logos TRAZADAS-02.jpg"
              alt="Ipar Spindle"
              width={480}
              height={160}
              className="w-full h-auto max-h-20 object-contain object-left"
              priority
            />
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden h-7 w-7 shrink-0 ml-1" onClick={onClose}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}

          {profile?.role === 'admin' && (
            <>
              <Separator className="my-2" />
              {adminItems.map(item => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t p-3 space-y-2">
          <div className="flex items-center gap-2 px-2 py-1">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{profile?.full_name || 'Usuario'}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Cambiar tema"
            >
              <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
              title="Cerrar sesión"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
