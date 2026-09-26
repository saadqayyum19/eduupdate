import { useMemo, useState, type ReactNode } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  id: string;
  label: string;
  description?: string;
  color?: string;
}

/**
 * Searchable multi-select list with chips.
 * Used by the class wizard for picking teachers, incharge and students.
 */
export function MultiSelect({
  options,
  selected,
  onChange,
  searchPlaceholder = 'Search…',
  emptyText = 'No matches found.',
  maxHeight = '18rem',
  header,
}: {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  maxHeight?: string;
  header?: ReactNode;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(term) || (option.description ?? '').toLowerCase().includes(term),
    );
  }, [options, query]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  const selectedOptions = options.filter((option) => selected.includes(option.id));

  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
        {header}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(filtered.map((option) => option.id))}
          disabled={!filtered.length}
        >
          Select all
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onChange([])} disabled={!selected.length}>
          Clear
        </Button>
      </div>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 bg-slate-50/60 p-3">
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
            >
              {option.label}
              <button
                type="button"
                aria-label={`Remove ${option.label}`}
                onClick={() => toggle(option.id)}
                className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}

      <ul className="scroll-slim overflow-y-auto p-2" style={{ maxHeight }}>
        {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">{emptyText}</li>}
        {filtered.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => toggle(option.id)}
                aria-pressed={isSelected}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition',
                  isSelected ? 'bg-primary-50' : 'hover:bg-slate-50',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded border',
                    isSelected ? 'border-primary-600 bg-primary-600 text-white' : 'border-slate-300 bg-white',
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" aria-hidden />}
                </span>
                <Avatar name={option.label} color={option.color} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">{option.label}</span>
                  {option.description && (
                    <span className="block truncate text-xs text-slate-500">{option.description}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
