'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { toggleUserActive } from '@/app/actions/admin'
import { useRouter } from 'next/navigation'

interface ToggleUserActiveProps {
  userId: string
  active: boolean
  isSelf: boolean
}

export function ToggleUserActive({ userId, active, isSelf }: ToggleUserActiveProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isActive, setIsActive] = useState(active)

  function handleToggle() {
    if (isSelf) {
      toast.error('No puedes desactivar tu propio usuario')
      return
    }

    startTransition(async () => {
      const next = !isActive
      const result = await toggleUserActive(userId, next)
      if (result?.error) {
        toast.error('Error: ' + result.error)
      } else {
        setIsActive(next)
        toast.success(next ? 'Usuario activado' : 'Usuario desactivado')
        router.refresh()
      }
    })
  }

  return (
    <Button
      variant={isActive ? 'outline' : 'secondary'}
      size="sm"
      onClick={handleToggle}
      disabled={isPending || isSelf}
      className="text-xs"
    >
      {isPending ? '…' : isActive ? 'Desactivar' : 'Activar'}
    </Button>
  )
}
