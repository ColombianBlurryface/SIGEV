import { CalendarDays } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

export function EventosPage() {
  const { usuario } = useAuth()
  const nombre = usuario?.nombre_completo.split(' ')[0]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">Eventos</h1>
        <p className="text-[15px] text-subtle">Hola{nombre ? `, ${nombre}` : ''}. Aquí verás los eventos registrados.</p>
      </header>

      <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <CalendarDays aria-hidden="true" className="size-6" />
        </span>
        <h2 className="text-lg font-bold">El listado de eventos está en construcción</h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Esta vista se completa con la HU-06 (consultar eventos). El registro de eventos llega con la HU-01.
        </p>
      </Card>
    </div>
  )
}
