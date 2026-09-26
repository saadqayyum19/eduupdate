import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

/** Shared pagination footer for every list page. */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600',
        className,
      )}
    >
      <p>
        Showing <span className="font-medium text-slate-800">{(page - 1) * pageSize + (total ? 1 : 0)}</span>–
        <span className="font-medium text-slate-800">{Math.min(page * pageSize, total)}</span> of{' '}
        <span className="font-medium text-slate-800">{total}</span>
      </p>

      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Rows
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
          >
            Prev
          </Button>
          <span className="px-2 text-xs text-slate-500">
            Page {page} / {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            rightIcon={<ChevronRight className="h-4 w-4" />}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
