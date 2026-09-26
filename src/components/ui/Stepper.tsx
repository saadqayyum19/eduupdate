import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  id: string;
  label: string;
  description?: string;
}

/**
 * Numbered stepper for the class creation wizard.
 * Completed steps are clickable so users can jump back without losing data.
 */
export function Stepper({
  steps,
  currentIndex,
  onStepClick,
  className,
}: {
  steps: Step[];
  currentIndex: number;
  onStepClick?: (index: number) => void;
  className?: string;
}) {
  return (
    <ol className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-2', className)}>
      {steps.map((step, index) => {
        const isDone = index < currentIndex;
        const isActive = index === currentIndex;
        const clickable = Boolean(onStepClick) && index <= currentIndex;

        return (
          <li key={step.id} className="flex flex-1 items-start gap-3">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(index)}
              className={cn(
                'flex flex-1 items-start gap-3 rounded-md border p-3 text-left transition',
                isActive
                  ? 'border-primary-300 bg-primary-50/60'
                  : isDone
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : 'border-slate-200 bg-white',
                clickable && 'hover:border-primary-300',
                !clickable && 'cursor-default',
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  isDone
                    ? 'bg-emerald-600 text-white'
                    : isActive
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-500',
                )}
              >
                {isDone ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">{step.label}</span>
                {step.description && <span className="block text-xs text-slate-500">{step.description}</span>}
              </span>
            </button>

            {index < steps.length - 1 && (
              <motion.span
                initial={false}
                animate={{ backgroundColor: isDone ? '#10b981' : '#e2e8f0' }}
                className="mt-6 hidden h-0.5 flex-1 rounded-full sm:block"
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
