import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type ProgressTone = 'primary' | 'success' | 'warning' | 'danger';

const TONES: Record<ProgressTone, string> = {
  primary: 'bg-primary-600',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
};

/** Thin animated progress bar (attendance %, fee collection, quiz scores). */
export function Progress({
  value,
  tone = 'primary',
  className,
  showLabel = false,
  label,
}: {
  value: number;
  tone?: ProgressTone;
  className?: string;
  showLabel?: boolean;
  label?: string;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
          <span>{label}</span>
          <span className="font-semibold text-slate-700">{safe}%</span>
        </div>
      )}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={safe}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${safe}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={cn('h-full rounded-full', TONES[tone])}
        />
      </div>
    </div>
  );
}
