/**
 * Logo de SIGEV: cuatro cuadros (uno por categoría de requerimiento) y el nombre.
 * En modo oscuro los cuadros toman tonos dorados.
 */
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'lg'
  wordmarkClassName?: string
}

export function Logo({ className, size = 'sm', wordmarkClassName }: LogoProps) {
  const grande = size === 'lg'
  return (
    <div className={cn('flex items-center', grande ? 'gap-3' : 'gap-2.5', className)}>
      <div aria-hidden="true" className={cn('grid grid-cols-2', grande ? 'size-9 gap-1' : 'size-[30px] gap-[3px]')}>
        <span className={cn('bg-logo-1', grande ? 'rounded-[5px]' : 'rounded-[4px]')} />
        <span className={cn('bg-logo-2', grande ? 'rounded-[5px]' : 'rounded-[4px]')} />
        <span className={cn('bg-logo-3', grande ? 'rounded-[5px]' : 'rounded-[4px]')} />
        <span className={cn('bg-logo-4', grande ? 'rounded-[5px]' : 'rounded-[4px]')} />
      </div>
      <span
        className={cn(
          'font-display font-extrabold tracking-tight',
          grande ? 'text-[26px]' : 'text-[22px]',
          wordmarkClassName,
        )}
      >
        SIGEV
      </span>
    </div>
  )
}
