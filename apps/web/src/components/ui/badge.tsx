import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-primary/20 bg-primary/10 text-primary font-semibold',
        secondary:
          'border-border/60 bg-muted/60 text-muted-foreground',
        destructive:
          'border-destructive/20 bg-destructive/10 text-destructive',
        outline: 'border-border text-foreground',
        success:
          'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        warning:
          'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        indigo:
          'border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold',
        brass:
          'border-indigo-500/25 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
