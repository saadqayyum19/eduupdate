import type { ComponentPropsWithRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends ComponentPropsWithRef<'div'> {
  /** Slight lift on hover — used for clickable cards. */
  hover?: boolean;
  padded?: boolean;
}

export function Card({ className, hover, padded = true, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-md border border-slate-200 bg-white shadow-card',
        padded && 'p-5',
        hover && 'transition duration-200 hover:-translate-y-0.5 hover:shadow-pop',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-start justify-between gap-3', className)}>
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('text-sm text-slate-600', className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-4', className)}>
      {children}
    </div>
  );
}

/** Small labelled metric used inside cards. */
export function Metric({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-md border border-slate-200 bg-slate-50/60 p-4', className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
