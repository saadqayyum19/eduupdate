import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  to?: string;
}

/** Consistent page title block: breadcrumb, title, description and actions. */
export function PageHeader({
  title,
  description,
  icon,
  actions,
  crumbs,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  crumbs?: Crumb[];
  className?: string;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={cn('mb-6', className)}
    >
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
            {crumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {crumb.to ? (
                  <Link to={crumb.to} className="rounded transition hover:text-primary-700">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-600">{crumb.label}</span>
                )}
                {index < crumbs.length - 1 && <ChevronRight className="h-3 w-3" aria-hidden />}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon && (
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-50 text-primary-600">
              {icon}
            </span>
          )}
          <div>
            <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
            {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </motion.header>
  );
}
