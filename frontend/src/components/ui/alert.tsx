/**
 * Mensaje destacado de información, éxito, advertencia o error, con su ícono.
 * Los errores usan role="alert" para que los lectores de pantalla los anuncien.
 */
import { cva, type VariantProps } from 'class-variance-authority'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

const alertVariants = cva('flex items-start gap-3 rounded-xl border px-4 py-3 text-[13.5px] leading-relaxed', {
  variants: {
    variant: {
      info: 'border-transparent bg-accent text-accent-foreground',
      success: 'border-transparent bg-success-soft text-success-foreground',
      warning: 'border-transparent bg-warning-soft text-warning-foreground',
      error: 'border-destructive-border bg-destructive-soft text-destructive-foreground',
    },
  },
  defaultVariants: {
    variant: 'info',
  },
})

const iconos = {
  info: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  error: CircleAlert,
}

type AlertProps = ComponentProps<'div'> & VariantProps<typeof alertVariants>

function Alert({ className, variant, children, ...props }: AlertProps) {
  const Icono = iconos[variant ?? 'info']
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={cn(alertVariants({ variant }), className)} {...props}>
      <Icono aria-hidden="true" className="mt-0.5 size-[18px] shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export { Alert }
