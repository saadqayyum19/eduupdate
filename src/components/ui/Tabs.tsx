import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
}

/** Animated tab bar used by attendance, quizzes, marks and fees screens. */
export function Tabs({
  items,
  value,
  onChange,
  className,
  ariaLabel = 'Sections',
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('scroll-slim flex gap-1 overflow-x-auto border-b border-slate-200', className)}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'relative flex items-center gap-2 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition',
              active ? 'text-primary-700' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {item.icon}
            {item.label}
            {item.badge !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                  active ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500',
                )}
              >
                {item.badge}
              </span>
            )}
            {active && (
              <motion.span
                layoutId={`tab-underline-${ariaLabel}`}
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary-600"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
