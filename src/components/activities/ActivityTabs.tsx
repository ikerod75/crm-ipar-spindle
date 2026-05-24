'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Users } from 'lucide-react'

interface ActivityTabsProps {
  todasContent: React.ReactNode
  personaContent: React.ReactNode
}

export function ActivityTabs({ todasContent, personaContent }: ActivityTabsProps) {
  const [tab, setTab] = useState<'todas' | 'persona'>('todas')

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setTab('todas')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            tab === 'todas'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Todas las actividades
        </button>
        <button
          onClick={() => setTab('persona')}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5',
            tab === 'persona'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Por persona
        </button>
      </div>

      {/* Content */}
      {tab === 'todas' ? todasContent : personaContent}
    </div>
  )
}
