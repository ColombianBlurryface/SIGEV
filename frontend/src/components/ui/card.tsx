/**
 * Tarjeta base: fondo, borde y esquinas redondeadas.
 */
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

function Card({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('rounded-2xl border border-border bg-card text-foreground', className)} {...props} />
}

export { Card }
