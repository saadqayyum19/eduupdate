import { useMemo, useState, type ComponentPropsWithRef, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SkeletonTable } from './Skeleton';
import { EmptyState } from './EmptyState';

/* ------------------------------------------------------------------ primitives */

export function TableWrap({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('scroll-slim -mx-5 overflow-x-auto px-5', className)}>
      <table className="w-full min-w-[42rem] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ className, children, ...props }: ComponentPropsWithRef<'th'>) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap border-b border-slate-200 bg-slate-50/80 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({ className, children, ...props }: ComponentPropsWithRef<'td'>) {
  return (
    <td className={cn('border-b border-slate-100 px-3 py-3 align-middle text-slate-700', className)} {...props}>
      {children}
    </td>
  );
}

export function Tr({ className, children, ...props }: ComponentPropsWithRef<'tr'>) {
  return (
    <tr className={cn('transition hover:bg-slate-50/70', className)} {...props}>
      {children}
    </tr>
  );
}

/* ------------------------------------------------------------------- data table */

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Provide to make the column sortable. */
  sortValue?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  defaultSortKey?: string;
  defaultSortDirection?: 'asc' | 'desc';
}

/**
 * Sortable, responsive table with built-in loading + empty states.
 * Every list page in the app uses this so behaviour is identical everywhere.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'New records will appear here as soon as they are added.',
  emptyAction,
  onRowClick,
  defaultSortKey,
  defaultSortDirection = 'asc',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [direction, setDirection] = useState<'asc' | 'desc'>(defaultSortDirection);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv), undefined, { numeric: true });
    });
    return direction === 'asc' ? copy : copy.reverse();
  }, [columns, direction, rows, sortKey]);

  if (loading) {
    return (
      <div className="pt-1">
        <SkeletonTable rows={6} columns={Math.min(columns.length, 5)} />
      </div>
    );
  }

  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDirection('asc');
    }
  };

  return (
    <TableWrap>
      <thead>
        <tr>
          {columns.map((column) => {
            const isActive = sortKey === column.key;
            return (
              <Th key={column.key} className={column.headerClassName}>
                {column.sortValue ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="inline-flex items-center gap-1 rounded text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:text-slate-800"
                    aria-label={`Sort by ${column.header}`}
                  >
                    {column.header}
                    {isActive ? (
                      direction === 'asc' ? (
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" aria-hidden />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </Th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => (
          <Tr
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={onRowClick ? 'cursor-pointer' : undefined}
          >
            {columns.map((column) => (
              <Td key={column.key} className={column.className}>
                {column.render(row)}
              </Td>
            ))}
          </Tr>
        ))}
      </tbody>
    </TableWrap>
  );
}
