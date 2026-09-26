import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/** Fade + slide animation applied to every routed page. */
export function PageTransition({ children, keyName }: { children: ReactNode; keyName: string }) {
  return (
    <motion.div
      key={keyName}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/** Full-viewport loader used while the app shell or a lazy route boots. */
export function LoadingScreen({ label = 'Loading EduCore Lite…' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
        className="h-9 w-9 rounded-full border-2 border-primary-200 border-t-primary-600"
      />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
