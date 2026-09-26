import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type StatTone = 'primary' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';

const TONES: Record<StatTone, { icon: string; ring: string }> = {
  primary: { icon: 'bg-primary-50 text-primary-600', ring: 'ring-primary-100' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-100' },
  amber: { icon: 'bg-amber-50 text-amber-600', ring: 'ring-amber-100' },
  rose: { icon: 'bg-rose-50 text-rose-600', ring: 'ring-rose-100' },
  violet: { icon: 'bg-violet-50 text-violet-600', ring: 'ring-violet-100' },
  slate: { icon: 'bg-slate-100 text-slate-600', ring: 'ring-slate-100' },
};

/** Big, obvious number card used at the top of every dashboard. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'primary',
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
      className={cn(
        'flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-card ring-1 ring-transparent',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold text-slate-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
      {icon && (
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md', TONES[tone].icon)}>
          {icon}
        </span>
      )}
    </motion.div>
  );
}
