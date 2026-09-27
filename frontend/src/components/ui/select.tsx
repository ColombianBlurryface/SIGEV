import { ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-12 w-full cursor-pointer appearance-none rounded-[10px] border border-input bg-card pr-10 pl-3.5 text-[15px] text-foreground outline-none transition-[color,box-shadow]',
          'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring',
          'aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-3.5 right-3.5 size-5 text-muted-foreground" />
    </div>
  )
}

export { Select }
