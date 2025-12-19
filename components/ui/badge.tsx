import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[rgb(35,45,51)] text-white [a&]:hover:bg-[rgb(35,45,51)]/90',
        secondary:
          'border-transparent bg-[rgb(230,230,230)] text-[rgb(35,45,51)] [a&]:hover:bg-[rgb(230,230,230)]/90',
        destructive:
          'border-transparent bg-[rgb(255,42,57)] text-white [a&]:hover:bg-[rgb(255,42,57)]/90',
        outline:
          'text-foreground [a&]:hover:bg-[rgb(0,170,156)] [a&]:hover:text-white',
        success:
          'border-transparent bg-[rgb(230,248,246)] text-[rgb(0,170,156)] border-[rgb(0,170,156)] [a&]:hover:bg-[rgb(0,170,156)] [a&]:hover:text-white',
        warning:
          'border-transparent bg-[rgb(245,241,232)] text-[rgb(181,151,96)] border-[rgb(181,151,96)] [a&]:hover:bg-[rgb(181,151,96)] [a&]:hover:text-white',
        error:
          'border-transparent bg-[rgb(255,235,236)] text-[rgb(255,42,57)] border-[rgb(255,42,57)] [a&]:hover:bg-[rgb(255,42,57)] [a&]:hover:text-white',
        info:
          'border-transparent bg-[rgb(240,242,243)] text-[rgb(35,45,51)] border-[rgb(35,45,51)] [a&]:hover:bg-[rgb(35,45,51)] [a&]:hover:text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
