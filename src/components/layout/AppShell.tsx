import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { APP_NAME, SCHOOL_NAME } from '@/lib/constants';
import { PageTransition } from '@/components/ui/PageTransition';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * The application frame: collapsible sidebar + sticky topbar + animated page area.
 * Every authenticated route renders inside `<Outlet />`.
 */
export function AppShell() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <a
        href="#main-content"
        className="sr-only-focusable absolute left-3 top-3 z-50 rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white"
      >
        Skip to main content
      </a>

      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />

        <main id="main-content" className="mx-auto w-full max-w-[92rem] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <PageTransition keyName={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </main>

        <footer className="border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
          {APP_NAME} • {SCHOOL_NAME} • UI prototype with sample data
        </footer>
      </div>
    </div>
  );
}
