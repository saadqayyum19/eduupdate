import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Search, Users } from 'lucide-react';
import { useClasses, useSubjects, useUsers } from '@/services/api';
import { useDebounced } from '@/hooks/useDebounced';
import { usePermissions } from '@/hooks/usePermissions';
import { classLabel } from '@/lib/lookups';
import { navigationFor } from '@/lib/navigation';
import { getInstitutionFeatures, subscribeInstitutionFeatures, type InstitutionFeatureMap } from '@/mocks/institutionFeatures';

interface Result {
  id: string;
  label: string;
  hint: string;
  to: string;
  group: 'Pages' | 'People' | 'Classes' | 'Subjects';
}

/** Topbar search across pages, people, classes and subjects. */
export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(query, 200);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { can, user: currentUser } = usePermissions();
  const [features, setFeatures] = useState<InstitutionFeatureMap>(getInstitutionFeatures);

  useEffect(() => subscribeInstitutionFeatures(setFeatures), []);

  const canViewUsers = can('users.view');
  const canViewClasses = can('classes.view');
  const canViewSubjects = can('subjects.view');

  const { data: users = [] } = useUsers(undefined, { enabled: canViewUsers });
  const { data: classes = [] } = useClasses({ enabled: canViewClasses });
  const { data: subjects = [] } = useSubjects({ enabled: canViewSubjects });

  useEffect(() => {
    const onClickAway = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickAway);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const results = useMemo<Result[]>(() => {
    const term = debounced.trim().toLowerCase();
    if (!term) return [];

    const allowedSections = navigationFor(can, currentUser?.role === 'super_admin' ? undefined : features);
    const pages: Result[] = allowedSections
      .flatMap((section) =>
        section.items.map((item) => ({
          id: `page-${item.to}`,
          label: item.label,
          hint: section.label,
          to: item.to,
          group: 'Pages' as const,
        })),
      )
      .filter((item) => item.label.toLowerCase().includes(term));

    const people: Result[] = canViewUsers
      ? users
          .filter(
            (user) =>
              user.name.toLowerCase().includes(term) ||
              user.email.toLowerCase().includes(term) ||
              (user.rollNo ?? '').toLowerCase().includes(term),
          )
          .slice(0, 5)
          .map((user) => ({
            id: `user-${user.id}`,
            label: user.name,
            hint: `${user.role.replace('_', ' ')}${user.rollNo ? ` • ${user.rollNo}` : ''}`,
            to: '/users',
            group: 'People' as const,
          }))
      : [];

    const classResults: Result[] = canViewClasses
      ? classes
          .filter((classRoom) => {
            // Scope for teacher / teacher_incharge to classes they teach
            if (currentUser?.role === 'teacher' || currentUser?.role === 'teacher_incharge') {
              if (currentUser.classIds && !currentUser.classIds.includes(classRoom.id)) return false;
            }
            return classLabel(classRoom).toLowerCase().includes(term);
          })
          .slice(0, 4)
          .map((classRoom) => ({
            id: `class-${classRoom.id}`,
            label: classLabel(classRoom),
            hint: `${classRoom.studentIds.length} students`,
            to: `/classes/${classRoom.id}`,
            group: 'Classes' as const,
          }))
      : [];

    const subjectResults: Result[] = canViewSubjects
      ? subjects
          .filter(
            (subject) => subject.name.toLowerCase().includes(term) || subject.code.toLowerCase().includes(term),
          )
          .slice(0, 4)
          .map((subject) => ({
            id: `subject-${subject.id}`,
            label: subject.name,
            hint: `${subject.code} • ${subject.classIds.length} classes`,
            to: '/subjects',
            group: 'Subjects' as const,
          }))
      : [];

    return [...pages, ...people, ...classResults, ...subjectResults].slice(0, 9);
  }, [can, canViewClasses, canViewSubjects, canViewUsers, classes, currentUser, debounced, features, subjects, users]);

  const grouped = results.reduce<Record<string, Result[]>>((acc, result) => {
    acc[result.group] = [...(acc[result.group] ?? []), result];
    return acc;
  }, {});


  const go = (result: Result) => {
    navigate(result.to);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative hidden flex-1 sm:block sm:max-w-md">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <input
        id="global-search-input"
        type="search"
        role="searchbox"
        aria-label="Search students, classes and pages"
        placeholder="Search students, classes, pages… (Ctrl K)"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm placeholder:text-slate-400 transition focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
      />

      <AnimatePresence>
        {open && query.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-md border border-slate-200 bg-white shadow-pop"
          >
            {results.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No matches for “{query}”.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto py-1">
                {Object.entries(grouped).map(([group, groupResults]) => (
                  <div key={group}>
                    <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {group}
                    </p>
                    <ul>
                      {groupResults.map((result) => (
                        <li key={result.id}>
                          <button
                            type="button"
                            onClick={() => go(result)}
                            className="flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-slate-50"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                              {result.group === 'People' ? (
                                <Users className="h-4 w-4" aria-hidden />
                              ) : (
                                <BookOpen className="h-4 w-4" aria-hidden />
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-slate-800">{result.label}</span>
                              <span className="block truncate text-xs capitalize text-slate-500">{result.hint}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
