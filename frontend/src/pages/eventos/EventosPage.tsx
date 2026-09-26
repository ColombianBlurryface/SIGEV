import { CalendarDays, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

export function EventosPage() {
  const { usuario } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [aviso] = useState(() => (location.state as { aviso?: string } | null)?.aviso)

  useEffect(() => {
    if (aviso) navigate(location.pathname, { replace: true, state: null })
  }, [aviso, location.pathname, navigate])
  const nombre = usuario?.nombre_completo.split(' ')[0]

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">Eventos</h1>
          <p className="text-[15px] text-subtle">Hola{nombre ? `, ${nombre}` : ''}. Aquí verás los eventos registrados.</p>
        </div>
        <Link to="/eventos/nuevo" className={buttonVariants()}>
          <Plus aria-hidden="true" />
          Nuevo evento
        </Link>
      </header>

      {aviso && <Alert variant="success">{aviso}</Alert>}

      <Card className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <CalendarDays aria-hidden="true" className="size-6" />
        </span>
        <h2 className="text-lg font-bold">El listado de eventos está en construcción</h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          Esta vista se completa con la HU-06 (consultar eventos). Mientras tanto ya puedes registrar eventos nuevos.
        </p>
      </Card>
    </div>
  )
}
