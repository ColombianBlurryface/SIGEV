/**
 * Bloque gris animado que se muestra mientras se cargan los datos.
 */
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-chip', className)} {...props} />
}

export { Skeleton }
