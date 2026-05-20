import { createClient } from '@/lib/supabase/server'
import { isToday, isThisWeek, isPast, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { TaskForm } from '@/components/tasks/TaskForm'
import { TaskCheckbox } from '@/components/tasks/TaskCheckbox'
import { AlertCircle, Calendar, Clock, CheckSquare2 } from 'lucide-react'
import type { Task, TaskPriority } from '@/types/database'

type TaskRow = Task & {
  company: { id: string; name: string } | null
  assignee: { id: string; full_name: string } | null
}

function priorityBadgeClass(priority: TaskPriority): string {
  if (priority === 'alta') return 'bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-400'
  if (priority === 'media') return 'bg-yellow-500/10 text-yellow-700 ring-yellow-500/20 dark:text-yellow-400'
  return 'bg-gray-500/10 text-gray-600 ring-gray-500/20 dark:text-gray-400'
}

const priorityLabel: Record<TaskPriority, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

interface TaskCardProps { task: TaskRow }

function TaskCard({ task }: TaskCardProps) {
  const overdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className="mt-0.5">
        <TaskCheckbox taskId={task.id} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{task.title}</p>
          <span
            className={`flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${priorityBadgeClass(task.priority)}`}
          >
            {priorityLabel[task.priority]}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {task.company && (
            <Link href={`/companies/${task.company.id}`} className="text-primary hover:underline">
              {task.company.name}
            </Link>
          )}
          {task.due_date && (
            <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
              <Calendar className="h-3 w-3" />
              {format(parseISO(task.due_date), 'dd/MM/yyyy', { locale: es })}
              {task.due_time && (
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {task.due_time.slice(0, 5)}
                </span>
              )}
            </span>
          )}
          {task.assignee && (
            <span>{task.assignee.full_name}</span>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
        )}
      </div>
    </div>
  )
}

function TaskGroup({ title, tasks, icon }: { title: string; tasks: TaskRow[]; icon: React.ReactNode }) {
  if (tasks.length === 0) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
        <span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {tasks.map(task => <TaskCard key={task.id} task={task} />)}
      </div>
    </div>
  )
}

export default async function TasksPage() {
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, company:companies(id,name), assignee:profiles!assigned_to(id,full_name)')
    .eq('status', 'pendiente')
    .order('due_date', { ascending: true })

  const rows = (tasks ?? []) as TaskRow[]

  const overdue: TaskRow[] = []
  const today: TaskRow[] = []
  const thisWeek: TaskRow[] = []
  const later: TaskRow[] = []

  for (const task of rows) {
    if (!task.due_date) {
      later.push(task)
      continue
    }
    const d = parseISO(task.due_date)
    if (isPast(d) && !isToday(d)) {
      overdue.push(task)
    } else if (isToday(d)) {
      today.push(task)
    } else if (isThisWeek(d, { weekStartsOn: 1 })) {
      thisWeek.push(task)
    } else {
      later.push(task)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tareas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{rows.length} tareas pendientes</p>
        </div>
        <TaskForm />
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckSquare2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">¡Ninguna tarea pendiente!</p>
          <p className="text-xs mt-1">Crea una nueva tarea para empezar</p>
        </div>
      ) : (
        <div className="space-y-6">
          <TaskGroup
            title="Vencidas"
            tasks={overdue}
            icon={<AlertCircle className="h-4 w-4 text-red-500" />}
          />
          <TaskGroup
            title="Hoy"
            tasks={today}
            icon={<Calendar className="h-4 w-4 text-primary" />}
          />
          <TaskGroup
            title="Esta semana"
            tasks={thisWeek}
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          />
          <TaskGroup
            title="Más adelante"
            tasks={later}
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          />
        </div>
      )}
    </div>
  )
}
