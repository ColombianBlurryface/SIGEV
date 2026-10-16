/**
 * Estructura de las páginas privadas.
 *
 * En pantallas grandes (lg o más): menú lateral fijo a la izquierda y el contenido de la página
 * actual (<Outlet />) a la derecha, con su propio scroll.
 * En pantallas pequeñas: una barra superior con el botón de menú; el menú se abre como un cajón
 * sobre el contenido y la página usa el scroll normal del navegador.
 */
import { Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { Sidebar } from '@/components/layout/Sidebar'

export function AppLayout() {
  const [menuAbierto, setMenuAbierto] = useState(false)

  // Con el cajón abierto, la tecla Escape lo cierra
  useEffect(() => {
    if (!menuAbierto) return
    const alPresionar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuAbierto(false)
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [menuAbierto])

  return (
    <div className="flex min-h-dvh bg-background lg:min-h-screen">
      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
            aria-expanded={menuAbierto}
            className="flex size-10 cursor-pointer items-center justify-center rounded-[10px] text-foreground outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            <Menu aria-hidden="true" className="size-6" />
          </button>
          <Logo wordmarkClassName="text-foreground dark:text-panel-accent" />
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:h-screen lg:overflow-y-auto lg:px-10 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
