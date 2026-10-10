/**
 * Estilos del botón según su variante (principal, secundario, fantasma, peligro) y tamaño.
 * Está separado de button.tsx para poder dar estilo de botón también a enlaces (<Link>).
 */
import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-bold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-[18px] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'border border-input bg-card text-foreground hover:bg-muted',
        ghost: 'text-primary hover:bg-accent',
        destructive: 'bg-destructive text-primary-foreground hover:opacity-90',
      },
      size: {
        default: 'h-11 px-5 text-[15px]',
        sm: 'h-9 px-3.5 text-[13.5px]',
        lg: 'h-12 px-6 text-[15px]',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
