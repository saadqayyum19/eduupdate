import type { ReactNode } from 'react';
import { Construction } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

/**
 * Holding screen for modules whose navigation, permissions and API layer are
 * already wired up but whose full UI is still being built (Marks, Fees,
 * Announcements, Reports). Keeps sidebar links working instead of 404-ing.
 */
export function PlaceholderPage({
  title,
  description,
  icon,
  statusNote,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  statusNote?: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} icon={icon} />
      <EmptyState
        icon={<Construction className="h-6 w-6" aria-hidden />}
        title="This module is coming soon"
        description={
          statusNote ??
          "The data layer and permissions are already in place — this screen is still being built. Check back shortly."
        }
      />
    </div>
  );
}
