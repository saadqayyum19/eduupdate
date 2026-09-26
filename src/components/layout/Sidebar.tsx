import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { ChevronDown, ChevronsLeft, ChevronsRight, GraduationCap, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { navigationFor } from '@/lib/navigation';
import { setMobileNavOpen, toggleSidebar } from '@/features/ui/uiSlice';
import { usePermissions } from '@/hooks/usePermissions';
import { APP_NAME, SCHOOL_NAME, SCHOOL_YEAR } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getInstitutionFeatures, subscribeInstitutionFeatures, type InstitutionFeatureMap } from '@/mocks/institutionFeatures';

/**
 * Collapsible sidebar, grouped by section (Dashboard / Academics / People / Finance / Reports).
 * Only the items the current role is allowed to open are rendered.
 */
export function Sidebar() {
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const mobileOpen = useAppSelector((state) => state.ui.mobileNavOpen);
  const dispatch = useAppDispatch();
  const { can, role } = usePermissions();
  const [closedSections, setClosedSections] = useState<string[]>([]);
  const [features, setFeatures] = useState<InstitutionFeatureMap>(getInstitutionFeatures);

  useEffect(() => subscribeInstitutionFeatures(setFeatures), []);

  const sections = navigationFor(can, role === 'super_admin' ? undefined : features);

  const navContent = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className={cn('flex items-center gap-3 px-4 py-4', collapsed && 'lg:justify-center lg:px-2')}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-600 text-white">
          <GraduationCap className="h-5 w-5" aria-hidden />
        </span>
        <span className={cn('min-w-0', collapsed && 'lg:hidden')}>
          <span className="block truncate text-sm font-semibold text-slate-900">{APP_NAME}</span>
          <span className="block truncate text-[11px] text-slate-500">{SCHOOL_NAME}</span>
        </span>
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => dispatch(setMobileNavOpen(false))}
          className="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="scroll-slim flex-1 overflow-y-auto px-2 pb-4">
        {sections.map((section) => (
          <div key={section.id} className="mb-4">
            <button
              type="button"
              aria-expanded={!closedSections.includes(section.id)}
              onClick={() => setClosedSections((current) => current.includes(section.id)
                ? current.filter((id) => id !== section.id)
                : [...current, section.id])}
              className={cn(
                'flex w-full items-center justify-between px-3 pb-1.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-700',
                collapsed && 'lg:justify-center lg:text-[10px]',
              )}
            >
              <span>{collapsed ? section.label.slice(0, 3) : section.label}</span>
              {!collapsed && <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', closedSections.includes(section.id) && '-rotate-90')} aria-hidden />}
            </button>
            {!closedSections.includes(section.id) && <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => dispatch(setMobileNavOpen(false))}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition',
                        collapsed && 'lg:justify-center lg:px-2',
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                      )
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                    <span className={cn('truncate', collapsed && 'lg:hidden')}>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={cn('border-t border-slate-200 p-3', collapsed && 'lg:px-2')}>
        <p className={cn('mb-2 px-1 text-[11px] text-slate-400', collapsed && 'lg:hidden')}>
          Academic year {SCHOOL_YEAR}
        </p>
        <button
          type="button"
          onClick={() => dispatch(toggleSidebar())}
          className={cn(
            'hidden w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 lg:flex',
            collapsed && 'lg:justify-center lg:px-2',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" aria-hidden />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" aria-hidden />
              Collapse
            </>
          )}
        </button>
        <p className={cn('mt-2 px-1 text-[11px] text-slate-400', collapsed && 'lg:hidden')}>
          Signed in as <span className="font-medium text-slate-600">{role?.replace('_', ' ')}</span>
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 76 : 256 }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="sticky top-0 hidden h-screen shrink-0 border-r border-slate-200 bg-white lg:block"
      >
        {navContent}
      </motion.aside>

      {/* Mobile drawer */}
      <motion.div
        initial={false}
        animate={{ opacity: mobileOpen ? 1 : 0, pointerEvents: mobileOpen ? 'auto' : 'none' }}
        className="fixed inset-0 z-50 lg:hidden"
        aria-hidden={!mobileOpen}
      >
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => dispatch(setMobileNavOpen(false))} />
        <motion.div
          initial={false}
          animate={{ x: mobileOpen ? 0 : '-100%' }}
          transition={{ type: 'spring', stiffness: 340, damping: 32 }}
          className="relative h-full w-72 max-w-[85vw] border-r border-slate-200 bg-white shadow-pop"
        >
          {navContent}
        </motion.div>
      </motion.div>
    </>
  );
}
