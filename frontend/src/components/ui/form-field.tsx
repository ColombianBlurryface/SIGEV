import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Label } from './label'

interface FormFieldProps {
  id: string
  label: string
  error?: string
  opcional?: boolean
  className?: string
  children: ReactNode
}

function FormField({ id, label, error, opcional, className, children }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>
        {label}
        {opcional && <span className="ml-1 font-medium text-muted-foreground">(opcional)</span>}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-[13px] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export { FormField }
