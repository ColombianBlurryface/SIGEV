/**
 * Envuelve un campo de formulario con su etiqueta, la marca "(opcional)", una ayuda corta y el mensaje de error.
 */
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'

interface FormFieldProps {
  id: string
  label: string
  error?: string
  // Texto de ayuda bajo el campo (no se muestra si hay un error)
  hint?: string
  opcional?: boolean
  className?: string
  children: ReactNode
}

function FormField({ id, label, error, hint, opcional, className, children }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>
        {label}
        {opcional && <span className="ml-1 font-medium text-muted-foreground">(opcional)</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-[12.5px] text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-[13px] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export { FormField }
