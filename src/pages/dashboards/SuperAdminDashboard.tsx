import { Link } from 'react-router-dom';
import { Building2, Plus, ShieldCheck, UserCog, Users } from 'lucide-react';
import { useClasses, useUsers } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { ChartCard, DonutChart } from '@/components/charts';
import { ROLE_LABELS, SCHOOL_NAME, SCHOOL_YEAR } from '@/lib/constants';
import { DashboardError, DashboardSkeleton, WelcomeCard } from './shared';

/** Super Admin dashboard: platform-level numbers and account administration. */
export function SuperAdminDashboard() {
  const { user } = usePermissions();
  const { data: users = [], isLoading, isError, refetch } = useUsers();
  const { data: classes = [] } = useClasses();

  if (isLoading) return <DashboardSkeleton />;
  if (isError) return <DashboardError onRetry={() => refetch()} />;

  const staff = users.filter((item) => item.role !== 'student' && item.role !== 'parent');
  const admins = users.filter((item) => item.role === 'admin' || item.role === 'super_admin');
  const roleSplit = ['super_admin', 'admin', 'principal', 'teacher_incharge', 'teacher', 'student', 'parent']
    .map((role) => ({
      label: ROLE_LABELS[role as keyof typeof ROLE_LABELS],
      value: users.filter((item) => item.role === role).length,
    }))
    .filter((row) => row.value > 0);

  return (
    <div>
      <WelcomeCard name={user?.name ?? 'Super Admin'} role="super_admin" scopeLabel={`${SCHOOL_NAME} • ${SCHOOL_YEAR}`}>
        <div className="flex flex-wrap gap-2">
          <Link to="/users">
            <Button leftIcon={<UserCog className="h-4 w-4" />}>Manage all accounts</Button>
          </Link>
          <Link to="/classes/new">
            <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />}>
              Create class
            </Button>
          </Link>
        </div>
      </WelcomeCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total accounts" value={users.length} hint="Every role in the system" icon={<Users className="h-5 w-5" />} />
        <StatCard
          label="Administrators"
          value={admins.length}
          hint="Admin + Super Admin"
          icon={<ShieldCheck className="h-5 w-5" />}
          tone="violet"
        />
        <StatCard
          label="Staff members"
          value={staff.length}
          hint="Teachers, incharges, leadership"
          icon={<Building2 className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Classes"
          value={classes.length}
          hint={`${classes.reduce((sum, item) => sum + item.studentIds.length, 0)} students enrolled`}
          icon={<Building2 className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2" title="Accounts by role" subtitle="Who is using EduCore Lite right now">
          <DonutChart data={roleSplit} />
        </ChartCard>

        <Card>
          <CardHeader title="School profile" subtitle="Single-school demo setup" />
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">School</dt>
              <dd className="font-medium text-slate-800">{SCHOOL_NAME}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Academic year</dt>
              <dd className="font-medium text-slate-800">{SCHOOL_YEAR}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Plan</dt>
              <dd>
                <Badge tone="success">Lite</Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Admins</dt>
              <dd className="font-medium text-slate-800">{admins.length}</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            This build is the UI layer only. Multi-school management and billing arrive with the API.
          </p>
        </Card>
      </div>
    </div>
  );
}
