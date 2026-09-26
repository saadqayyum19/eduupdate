import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAppSelector } from '@/app/hooks';
import { usePermissions } from '@/hooks/usePermissions';
import type { Capability } from '@/lib/permissions';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { getInstitutionFeatures, subscribeInstitutionFeatures, type InstitutionFeature } from '@/services/institutionFeatures';

/** Sends guests to the login screen, remembering where they wanted to go. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

/** Friendly "not your area" screen instead of a blank redirect. */
export function Forbidden({ capability }: { capability?: Capability }) {
  const { role } = usePermissions();
  const navigate = useNavigate();

  return (
    <EmptyState
      icon={<Lock className="h-6 w-6" aria-hidden />}
      title="You do not have access to this page"
      description={`Your role (${role?.replace('_', ' ') ?? 'guest'}) cannot open this section${
        capability ? ` (needs "${capability}")` : ''
      }. Ask an administrator to grant access, or go back to your dashboard.`}
      action={<Button onClick={() => navigate('/dashboard')}>Back to dashboard</Button>}
    />
  );
}

/** Route-level role guard: renders children only when the capability is granted. */
export function RequireCapability({
  capability,
  children,
}: {
  capability: Capability;
  children: ReactNode;
}) {
  const { can } = usePermissions();
  if (!can(capability)) return <Forbidden capability={capability} />;
  return children;
}

/** Hides disabled institution modules even when a user opens a deep link. */
export function RequireFeature({ feature, children }: { feature: InstitutionFeature; children: ReactNode }) {
  const { role } = usePermissions();
  const [enabled, setEnabled] = useState(() => getInstitutionFeatures()[feature]);

  useEffect(() => subscribeInstitutionFeatures((next) => setEnabled(next[feature])), [feature]);

  if (role === 'super_admin' || enabled) return children;
  return (
    <EmptyState
      icon={<Lock className="h-6 w-6" aria-hidden />}
      title="This module is disabled"
      description="A Super Admin has turned off this module for your institution."
    />
  );
}
