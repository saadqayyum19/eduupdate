import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { pushToast, dismissToast } from '@/features/ui/uiSlice';
import { cn } from '@/lib/utils';
import type { ToastMessage } from '@/types';

const ICONS = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />,
  error: <AlertCircle className="h-5 w-5 text-rose-600" aria-hidden />,
  info: <Info className="h-5 w-5 text-primary-600" aria-hidden />,
};

/** Errors stay longer because they usually need reading twice. */
const DEFAULT_DURATION: Record<ToastMessage['variant'], number> = {
  success: 3500,
  info: 4000,
  error: 6500,
};

/** A single toast that removes itself once its lifetime elapses. */
function ToastRow({ toast }: { toast: ToastMessage }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const lifetime = toast.durationMs ?? DEFAULT_DURATION[toast.variant];
    const timer = window.setTimeout(() => dispatch(dismissToast(toast.id)), lifetime);
    return () => window.clearTimeout(timer);
  }, [dispatch, toast.durationMs, toast.id, toast.variant]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-md border bg-white p-3 shadow-pop',
        toast.variant === 'error' ? 'border-rose-200' : 'border-slate-200',
      )}
    >
      {ICONS[toast.variant]}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-xs text-slate-500">{toast.description}</p>}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => dispatch(dismissToast(toast.id))}
        className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </motion.div>
  );
}

/**
 * Global toast viewport (bottom right). Toasts are queued in Redux so any page,
 * hook or future API interceptor can raise one with `pushToast`, and each toast
 * dismisses itself after its lifetime.
 */
export function ToastViewport() {
  const toasts = useAppSelector((state) => state.ui.toasts);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,22rem)] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastRow key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Small helper so pages can raise a toast without remembering the action shape. */
export function useToast() {
  const dispatch = useAppDispatch();
  return {
    success: (title: string, description?: string) =>
      dispatch(pushToast({ title, description, variant: 'success' })),
    error: (title: string, description?: string) => dispatch(pushToast({ title, description, variant: 'error' })),
    info: (title: string, description?: string) => dispatch(pushToast({ title, description, variant: 'info' })),
  };
}
