import { Armchair, Info, LoaderCircle, LockKeyhole, Music, User, Utensils, Wine, type LucideIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/services/api'

interface EjemploCalculo {
  icono: LucideIcon
  titulo: string
  detalle: string
  resultado: string
  clases: string
}

const ejemplos: EjemploCalculo[] = [
  { icono: Utensils, titulo: 'Lomo de res', detalle: '200 g por persona', resultado: '55 kg', clases: 'bg-alimentos-soft text-alimentos' },
  { icono: Wine, titulo: 'Vino tinto', detalle: 'Copa de 150 ml', resultado: '55 botellas', clases: 'bg-bebidas-soft text-bebidas' },
  { icono: Armchair, titulo: 'Sillas', detalle: 'Una por asistente', resultado: '250', clases: 'bg-mobiliario-soft text-mobiliario' },
  { icono: Music, titulo: 'DJ', detalle: 'Recepción y fiesta', resultado: '6 h', clases: 'bg-servicios-soft text-servicios' },
]

export function LoginPage() {
  const { iniciarSesion } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const destino = (location.state as { desde?: string } | null)?.desde ?? '/eventos'

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setError(null)

    if (!usuario.trim() || !password) {
      setError('Ingresa tu usuario y contraseña.')
      return
    }

    setEnviando(true)
    try {
      await iniciarSesion({ usuario: usuario.trim(), password })
      navigate(destino, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No fue posible iniciar sesión. Intenta de nuevo.')
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-[640px] shrink-0 flex-col justify-between bg-panel px-16 py-14 text-panel-foreground lg:flex">
        <Logo size="lg" wordmarkClassName="text-panel-accent" />

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h1 className="font-display text-[52px] leading-[1.04] font-extrabold tracking-tight">
              Planifica cada evento con precisión.
            </h1>
            <p className="max-w-[460px] text-[17px] leading-relaxed text-panel-muted">
              Calcula alimentos, bebidas y mobiliario según tus asistentes, con el margen de seguridad ya incluido.
            </p>
          </div>

          <div className="flex flex-col gap-3.5 rounded-[20px] border border-panel-card-border bg-panel-card p-6">
            <div className="flex items-baseline justify-between">
              <span className="text-[15px] font-bold">Ejemplo · 250 asistentes</span>
              <span className="text-[12.5px] text-panel-subtle">Margen del 10% incluido</span>
            </div>
            {ejemplos.map(({ icono: Icono, titulo, detalle, resultado, clases }) => (
              <div key={titulo} className="flex items-center gap-3.5">
                <span aria-hidden="true" className={`flex size-10 items-center justify-center rounded-[10px] ${clases}`}>
                  <Icono className="size-5" />
                </span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold">{titulo}</span>
                  <span className="text-[12.5px] text-panel-subtle">{detalle}</span>
                </div>
                <span className="font-display text-[22px] font-bold text-panel-accent">{resultado}</span>
              </div>
            ))}
          </div>
        </div>

        <span className="text-[13px] text-panel-subtle">Sistema de Gestión y Planificación Logística de Eventos</span>
      </aside>

      <main className="relative flex flex-1 items-center justify-center px-6 py-16">
        <ThemeToggle className="absolute top-8 right-10" />

        <div className="flex w-full max-w-[400px] flex-col gap-7">
          <Logo className="lg:hidden" wordmarkClassName="text-foreground dark:text-panel-accent" />

          <div className="flex flex-col gap-2.5">
            <h2 className="font-display text-4xl font-extrabold tracking-tight">Iniciar sesión</h2>
            <p className="text-[15px] leading-relaxed text-subtle">
              Ingresa con el usuario que te asignó el administrador.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {error && <Alert variant="error">{error}</Alert>}

            <div className="flex flex-col gap-2">
              <Label htmlFor="usuario">Usuario</Label>
              <div className="relative">
                <User aria-hidden="true" className="pointer-events-none absolute top-3.5 left-3.5 size-5 text-muted-foreground" />
                <Input
                  id="usuario"
                  name="usuario"
                  autoComplete="username"
                  placeholder="Ej. lmendez"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  aria-invalid={error !== null && !usuario.trim()}
                  disabled={enviando}
                  className="pl-11"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute top-3.5 left-3.5 size-5 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={error !== null && !password}
                  disabled={enviando}
                  className="pr-24 pl-11"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMostrarPassword((v) => !v)}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute top-1.5 right-1.5"
                >
                  {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                </Button>
              </div>
            </div>

            <Button type="submit" size="lg" disabled={enviando} className="w-full">
              {enviando && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              {enviando ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>

          <div className="flex items-start gap-3 rounded-xl bg-accent px-4 py-3.5 text-accent-foreground">
            <Info aria-hidden="true" className="mt-0.5 size-[18px] shrink-0" />
            <p className="text-[13.5px] leading-relaxed">
              ¿No tienes acceso? Las cuentas las crea el administrador del sistema; no hay registro público.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
