'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter } from 'next/navigation'

interface TaskCheckboxProps {
  taskId: string
  completed?: boolean
}

export function TaskCheckbox({ taskId, completed = false }: TaskCheckboxProps) {
  const router = useRouter()
  const [checked, setChecked] = useState(completed)
  const [loading, setLoading] = useState(false)

  async function handleChange(value: boolean) {
    setChecked(value)
    setLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = supabase.from('tasks') as any
    const { error } = await table
      .update({ status: value ? 'completada' : 'pendiente' })
      .eq('id', taskId)

    setLoading(false)
    if (error) {
      toast.error('Error al actualizar la tarea')
      setChecked(!value)
    } else {
      if (value) toast.success('Tarea completada')
      router.refresh()
    }
  }

  return (
    <Checkbox
      checked={checked}
      onCheckedChange={handleChange}
      disabled={loading}
    />
  )
}
