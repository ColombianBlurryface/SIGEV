/**
 * Menú lateral: logo, navegación entre módulos, interruptor de modo oscuro,
 * datos del usuario y botón para cerrar sesión.
 */
import { Boxes, CalendarDays, CirclePlus, LogOut, Package, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/hooks/useAuth'
import { cn, iniciales } from '@/lib/utils'

interface ItemNavegacion {
  etiqueta: string
  icono: LucideIcon
  ruta?: string
}

// Opciones del menú. Las que no tienen ruta todavía se muestran deshabilitadas con la etiqueta "Pronto".
const navegacion: ItemNavegacion[] = [
  { etiqueta: 'Eventos', icono: CalendarDays, ruta: '/eventos' },
  { etiqueta: 'Nuevo evento', icono: CirclePlus, ruta: '/eventos/nuevo' },
  { etiqueta: 'Inventario', icono: Boxes, ruta: '/inventario' },
  { etiqueta: 'Catálogo', icono: Package, ruta: '/catalogo' },
]

const claseItem = 'flex h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] font-semibold'

export function Sidebar() {
  const { usuario, cerrarSesion } = useAuth()

  return (
    <nav
      aria-label="Navegación principal"
      className="flex h-screen w-62 shrink-0 flex-col gap-8 border-r border-border bg-card px-4 pt-7 pb-6"
    >
      <Logo className="px-2" wordmarkClassName="text-foreground dark:text-panel-accent" />

      <div className="flex flex-col gap-1">
        <span className="px-3 pb-1.5 text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
          Gestión
        </span>
        {navegacion.map(({ etiqueta, icono: Icono, ruta }) =>
          ruta ? (
            <NavLink
              key={etiqueta}
              to={ruta}
              end
              className={({ isActive }) =>
                cn(
                  claseItem,
                  'outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                  isActive ? 'bg-accent text-accent-foreground' : 'text-subtle hover:bg-muted',
                )
              }
            >
              <Icono aria-hidden="true" className="size-5" />
              {etiqueta}
            </NavLink>
          ) : (
            <div key={etiqueta} aria-disabled="true" className={cn(claseItem, 'text-faint')}>
              <Icono aria-hidden="true" className="size-5" />
              <span className="flex-1 whitespace-nowrap">{etiqueta}</span>
              <span className="rounded-full bg-chip px-1.5 py-0.5 text-[10.5px] font-bold text-subtle">Pronto</span>
            </div>
          ),
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
        <ThemeToggle variant="row" />
        {usuario && (
          <div className="flex items-center gap-3 px-2 py-1">
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground"
            >
              {iniciales(usuario.nombre_completo)}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold">{usuario.nombre_completo}</span>
              <span className="text-xs text-muted-foreground capitalize">{usuario.rol}</span>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={cerrarSesion}
          className={cn(
            claseItem,
            'cursor-pointer text-sm text-subtle outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring',
          )}
        >
          <LogOut aria-hidden="true" className="size-5" />
          Cerrar sesión
        </button>
      </div>
    </nav>
  )
}
