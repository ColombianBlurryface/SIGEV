/**
 * Botón base de la app (estilo shadcn/ui). Sus variantes y tamaños están en button-variants.ts.
 */
import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button-variants'

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>

function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { Button }
