import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  variant?: 'pill' | 'row'
  className?: string
}

export function ThemeToggle({ variant = 'pill', className }: ThemeToggleProps) {
  const { tema, alternarTema } = useTheme()
  const oscuro = tema === 'oscuro'

  if (variant === 'row') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={oscuro}
        aria-label="Modo oscuro"
        onClick={alternarTema}
        className={cn(
          'flex h-11 w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 text-left text-sm font-semibold text-subtle outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring',
          className,
        )}
      >
        <Moon aria-hidden="true" className="size-5" />
        <span className="flex-1">Modo oscuro</span>
        <span
          aria-hidden="true"
          className={cn('relative h-5 w-9 rounded-full transition-colors', oscuro ? 'bg-primary' : 'bg-faint')}
        >
          <span
            className={cn(
              'absolute top-0.5 size-4 rounded-full bg-white transition-[left]',
              oscuro ? 'left-[18px]' : 'left-0.5',
            )}
          />
        </span>
      </button>
    )
  }

  const Icono = oscuro ? Sun : Moon
  return (
    <button
      type="button"
      onClick={alternarTema}
      className={cn(
        'inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-input bg-card px-3.5 text-[13px] font-semibold text-foreground outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring',
        className,
      )}
    >
      <Icono aria-hidden="true" className="size-[17px]" />
      {oscuro ? 'Modo claro' : 'Modo oscuro'}
    </button>
  )
}
