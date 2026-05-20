'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import type { Profile } from '@/types/database'

export function AppShell({ children, profile }: { children: React.ReactNode; profile: Profile | null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar profile={profile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-card">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">Ipar Spindle CRM</span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
