import { cn } from '@/lib/utils'

export type BadgeVariant = 'ok' | 'error' | 'warn' | 'info' | 'neutral' | 'accent'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

export function Badge({ variant = 'neutral', children, className, dot }: BadgeProps) {
  return (
    <span className={cn('badge', `badge-${variant}`, className)}>
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', {
          'bg-s_ok':    variant === 'ok',
          'bg-s_error': variant === 'error',
          'bg-s_warn':  variant === 'warn',
          'bg-s_info':  variant === 'info',
          'bg-t-3':     variant === 'neutral',
          'bg-accent':  variant === 'accent',
        })} />
      )}
      {children}
    </span>
  )
}
