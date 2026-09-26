import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useAnnouncements } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { timeAgo } from '@/lib/utils';

/**
 * Notification bell with a popover listing the latest notices for the current role.
 * High-priority notices are counted in the red badge.
 */
export function NotificationBell() {
  const { role } = usePermissions();
  const { data: announcements = [], isLoading } = useAnnouncements(role);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const important = announcements.filter((item) => item.priority === 'high').length;

  useEffect(() => {
    if (!open) return undefined;
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
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Notifications${important ? `, ${important} important` : ''}`}
        className="relative rounded-md border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {important > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {important}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-md border border-slate-200 bg-white shadow-pop"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
              <p className="text-sm font-semibold text-slate-800">Notifications</p>
              <span className="text-xs text-slate-500">{announcements.length} total</span>
            </div>

            <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {isLoading && <li className="px-3 py-6 text-center text-sm text-slate-500">Loading…</li>}
              {!isLoading && announcements.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-slate-500">No notices yet.</li>
              )}
              {announcements.slice(0, 4).map((item) => (
                <li key={item.id} className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">{item.title}</p>
                    {item.priority === 'high' && <Badge tone="danger">Important</Badge>}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.body}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{timeAgo(item.createdAt)}</p>
                </li>
              ))}
            </ul>

            <div className="border-t border-slate-100 p-2">
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => {
                  setOpen(false);
                  navigate('/announcements');
                }}
              >
                View all announcements
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
