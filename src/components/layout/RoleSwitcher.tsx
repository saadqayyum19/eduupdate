import { useNavigate } from 'react-router-dom';
import { Repeat, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { switchRole } from '@/features/auth/authSlice';
import { ROLE_LABELS, ROLE_ORDER, ROLE_BADGE } from '@/lib/constants';
import { resetDb } from '@/services/mockDb';
import { Dropdown } from '@/components/ui/Dropdown';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

/**
 * Dev-only role switcher — lets you preview every role's screens.
 * Hidden automatically if `auth.roleSwitcherEnabled` is false (i.e. in a real deployment).
 */
export function RoleSwitcher() {
  const user = useAppSelector((state) => state.auth.user);
  const enabled = useAppSelector((state) => state.auth.roleSwitcherEnabled);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  if (!enabled || !user) return null;

  return (
    <Dropdown
      align="right"
      menuClassName="w-64"
      items={ROLE_ORDER.map((role) => ({
        id: role,
        label: ROLE_LABELS[role],
        icon: <ShieldCheck className={cn('h-4 w-4', role === user.role ? 'text-primary-600' : 'text-slate-400')} />,
        dividerBefore: role === 'super_admin',
        onSelect: () => {
          dispatch(switchRole(role));
          resetDb();
          queryClient.clear();
          navigate('/dashboard');
          toast.info(`Previewing as ${ROLE_LABELS[role]}`, 'Sample data has been reloaded for this role.');
        },
      }))}
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          aria-label="Switch preview role"
        >
          <Repeat className="h-4 w-4 text-primary-600" aria-hidden />
          <span className="hidden md:inline">Preview role</span>
          <span
            className={cn(
              'hidden rounded-full border px-2 py-0.5 text-[11px] font-semibold lg:inline-flex',
              ROLE_BADGE[user.role],
            )}
          >
            {ROLE_LABELS[user.role]}
          </span>
        </button>
      )}
    />
  );
}
