import { useEffect } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { setMobileNavOpen } from '@/features/ui/uiSlice';
import { Menu } from 'lucide-react';
import { GlobalSearch } from './GlobalSearch';
import { NotificationBell } from './NotificationBell';
import { ProfileMenu } from './ProfileMenu';

/** Sticky top bar: mobile menu, global search, notifications, profile. */
export function Topbar() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('global-search-input')?.focus();
      }
    };
    document.addEventListener('keydown', onShortcut);
    return () => document.removeEventListener('keydown', onShortcut);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[92rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => dispatch(setMobileNavOpen(true))}
          aria-label="Open navigation menu"
          className="rounded-md border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 lg:hidden"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <div className="min-w-0 flex-1"><GlobalSearch /></div>

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
