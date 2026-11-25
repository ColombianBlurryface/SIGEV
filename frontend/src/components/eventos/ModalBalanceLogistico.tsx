/**
 * Modal Dialog de Balance Logístico (HU-31).
 *
 * Muestra el componente BalanceLogistico en un diálogo modal flotante con fondo semitransparente,
 * permitiendo cerrar mediante botón X, clic exterior o tecla Escape, y con scroll vertical adaptable a móviles.
 */
import { Layers, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { BalanceLogistico } from '@/components/eventos/BalanceLogistico'

interface ModalBalanceLogisticoProps {
  abierto: boolean
  onCerrar: () => void
  eventoId: number
  refrescoKey?: unknown
  soloFaltantesInicial?: boolean
}

export function ModalBalanceLogistico({
  abierto,
  onCerrar,
  eventoId,
  refrescoKey,
  soloFaltantesInicial = false,
}: ModalBalanceLogisticoProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // Cerrar al presionar la tecla Escape y bloquear el scroll del fondo
  useEffect(() => {
    if (!abierto) return

    const manejarTeclaEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Sin esto, si el balance está sobre otra ventana (el detalle del evento, HU-53), la misma tecla cerraría también esa
        e.preventDefault()
        onCerrar()
      }
    }

    const overflowOriginal = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', manejarTeclaEscape)

    return () => {
      document.body.style.overflow = overflowOriginal
      window.removeEventListener('keydown', manejarTeclaEscape)
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-balance-titulo"
      onClick={(e) => {
        // Cierra al hacer clic en el fondo semitransparente fuera del contenedor
        if (e.target === overlayRef.current) {
          onCerrar()
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div
        className="relative flex flex-col w-full max-w-3xl max-h-[92vh] rounded-[16px] border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-background">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-[8px] bg-primary text-primary-foreground">
              <Layers className="size-4.5" />
            </span>
            <div>
              <h2 id="modal-balance-titulo" className="font-display text-base font-bold text-foreground">
                Balance Logístico
              </h2>
              <p className="text-xs text-muted-foreground">
                Consolidado de recursos y disponibilidad del evento
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar modal"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {/* Contenido con scroll vertical y responsive */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <BalanceLogistico
            eventoId={eventoId}
            refrescoKey={refrescoKey}
            soloFaltantesInicial={soloFaltantesInicial}
            className="border-0 bg-transparent p-0"
            ocultarTitulo={true}
          />
        </div>
      </div>
    </div>
  )
}
