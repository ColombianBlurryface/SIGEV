/**
 * Ventana grande sobre la página (HU-53 · RF-60). Usa el <dialog> nativo del navegador en modo modal: con eso ya vienen el fondo
 * oscuro, el foco atrapado dentro de la ventana y el cierre con la tecla Esc, sin librerías. También se cierra al hacer clic en el
 * fondo. Mientras está abierta, la página de atrás no se desplaza.
 */
import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ModalProps {
  /** Nombre de la ventana para los lectores de pantalla (y para encontrarla en las pruebas) */
  etiqueta: string
  /** Se llama al cerrar: con Esc, con clic en el fondo o desde un botón propio de la ventana */
  onCerrar: () => void
  className?: string
  children: ReactNode
}

function Modal({ etiqueta, onCerrar, className, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    // En desarrollo React monta dos veces: si ya está abierta no se vuelve a abrir (daría error)
    if (!dialogo.open) dialogo.showModal()

    // El scroll de la página vive en <main> (pantallas grandes) o en el body (pequeñas): se congelan mientras la ventana está abierta
    const main = document.querySelector('main')
    const previoMain = main?.style.overflow ?? ''
    const previoBody = document.body.style.overflow
    if (main) main.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      if (main) main.style.overflow = previoMain
      document.body.style.overflow = previoBody
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-label={etiqueta}
      onClose={onCerrar}
      // Un clic directamente sobre el <dialog> (y no sobre su contenido) es un clic en el fondo oscuro
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
      className={cn(
        // `open:flex` (y no `flex` a secas) para que no se vea hasta que el navegador la abre
        'm-auto max-h-none max-w-none flex-col overflow-hidden rounded-[16px] border border-border bg-card p-0 text-foreground shadow-2xl open:flex',
        'backdrop:bg-black/55',
        className,
      )}
    >
      {children}
    </dialog>
  )
}

export { Modal }
