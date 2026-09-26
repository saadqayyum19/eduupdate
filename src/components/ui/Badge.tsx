import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'violet';

const TONES: Record<BadgeTone, string> = {
  primary: 'bg-primary-50 text-primary-700 border-primary-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
  icon,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** Maps a domain status onto a badge tone so every page colours statuses alike. */
export function statusTone(status: string): BadgeTone {
  switch (status) {
    case 'present':
    case 'paid':
    case 'active':
    case 'published':
    case 'success':
      return 'success';
    case 'late':
    case 'partial':
    case 'draft':
    case 'pending':
      return 'warning';
    case 'absent':
    case 'unpaid':
    case 'inactive':
    case 'error':
      return 'danger';
    case 'closed':
      return 'neutral';
    default:
      return 'primary';
  }
}
