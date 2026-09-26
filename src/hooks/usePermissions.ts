import { useCallback, useMemo } from 'react';
import { useAppSelector } from '@/app/hooks';
import { can, canAny, type Capability } from '@/lib/permissions';
import type { Role, User } from '@/types';

export interface UsePermissionsResult {
  user: User | null;
  role: Role | undefined;
  /** Check a single capability. */
  can: (capability: Capability) => boolean;
  /** Check if any of the capabilities is granted. */
  canAny: (capabilities: Capability[]) => boolean;
  /** True for student/parent — pages then show only their own data. */
  isSelfService: boolean;
}

/** One place every page asks "may I do this?" — keeps role logic out of components. */
export function usePermissions(): UsePermissionsResult {
  const user = useAppSelector((state) => state.auth.user);
  const role = user?.role;

  const check = useCallback((capability: Capability) => can(role, capability), [role]);
  const checkAny = useCallback((capabilities: Capability[]) => canAny(role, capabilities), [role]);

  return useMemo(
    () => ({
      user,
      role,
      can: check,
      canAny: checkAny,
      isSelfService: role === 'student' || role === 'parent',
    }),
    [check, checkAny, role, user],
  );
}
