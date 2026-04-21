import { Icon } from '../icons/icon'
import { cn } from '../lib/cn'

export type TimelineStep = {
  key: string
  label: string
  icon?: string
  done: boolean
  current?: boolean
  timestamp?: string
}

type Props = {
  steps: TimelineStep[]
  className?: string
}

export function Timeline({ steps, className }: Props) {
  return (
    <ol className={cn('flex flex-col gap-1', className)}>
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1
        return (
          <li key={step.key} className="relative flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                  step.done && 'bg-emerald-100 text-emerald-700 shadow-[0_4px_20px_rgba(16,185,129,0.15)]',
                  step.current && !step.done && 'bg-primary-container text-on-primary animate-pulse shadow-[0_4px_20px_rgba(255,107,53,0.25)]',
                  !step.done && !step.current && 'bg-surface-container text-on-surface-variant',
                )}
              >
                <Icon
                  name={step.icon ?? (step.done ? 'check' : 'circle')}
                  size={20}
                  filled={step.done}
                />
              </span>
              {!isLast && (
                <span
                  className={cn(
                    'w-0.5 flex-1 my-1 min-h-6',
                    step.done ? 'bg-emerald-300' : 'bg-surface-container-high',
                  )}
                />
              )}
            </div>
            <div className={cn('pb-6 flex-1', isLast && 'pb-0')}>
              <p
                className={cn(
                  'font-semibold',
                  step.done && 'text-emerald-700',
                  step.current && !step.done && 'text-on-surface',
                  !step.done && !step.current && 'text-on-surface-variant',
                )}
              >
                {step.label}
              </p>
              {step.timestamp && (
                <p className="text-xs text-on-surface-variant/80 mt-0.5">{step.timestamp}</p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
