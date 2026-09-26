import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, LogOut, Settings, UserRound } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { endSession } from '@/features/auth/session';
import { logoutRequest } from '@/services/auth';
import { ROLE_BADGE, ROLE_LABELS } from '@/lib/constants';
import { Avatar } from '@/components/ui/Avatar';
import { Dropdown } from '@/components/ui/Dropdown';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

/** Profile menu: profile, settings and sign out. */
export function ProfileMenu() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!user) return null;

  return (
    <Dropdown
      align="right"
      menuClassName="w-64"
      items={[
        {
          id: 'profile',
          label: 'My profile',
          icon: <UserRound className="h-4 w-4 text-slate-400" />,
          onSelect: () => navigate('/profile'),
        },
        {
          id: 'settings',
          label: 'System settings',
          icon: <Settings className="h-4 w-4 text-slate-400" />,
          dividerBefore: true,
          onSelect: () => navigate('/settings'),
        },
        {
          id: 'logout',
          label: 'Sign out',
          icon: <LogOut className="h-4 w-4" />,
          danger: true,
          dividerBefore: true,
          onSelect: () => {
            // Revoke the refresh token server-side, then clear the in-memory session.
            void logoutRequest().catch(() => undefined);
            endSession(dispatch);
            // Never let one user's cached queries leak into the next session.
            queryClient.clear();
            navigate('/login');
          },
        },
      ]}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 transition hover:bg-slate-50"
        >
          <Avatar name={user.name} color={user.avatarColor} size="sm" />
          <span className="hidden text-left md:block">
            <span className="block max-w-[9rem] truncate text-sm font-medium text-slate-800">{user.name}</span>
            <span className="block text-[11px] text-slate-500">{ROLE_LABELS[user.role]}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />
        </button>
      )}
    />
  );
}

/** Small badge used next to the profile name in dense layouts. */
export function RolePill({ role }: { role: keyof typeof ROLE_BADGE }) {
  return <Badge className={cn(ROLE_BADGE[role])}>{ROLE_LABELS[role]}</Badge>;
}
