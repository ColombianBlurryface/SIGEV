/**
 * Página que se muestra cuando la dirección no existe (error 404).
 */
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button-variants'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="font-display text-6xl font-extrabold text-primary">404</span>
      <h1 className="text-xl font-bold">No encontramos esta página</h1>
      <p className="text-sm text-muted-foreground">Revisa la dirección o vuelve al inicio.</p>
      <Link to="/" className={buttonVariants()}>
        Ir al inicio
      </Link>
    </main>
  )
}
