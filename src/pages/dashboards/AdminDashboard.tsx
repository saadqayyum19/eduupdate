import { Link } from 'react-router-dom';
import { ClipboardCheck, GraduationCap, TrendingUp, UserCheck, Users } from 'lucide-react';
import { useDashboard } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { DashboardError, DashboardSkeleton, FeesSummaryCard, TopPerformersCard, WelcomeCard } from './shared';
import { StatCard } from '@/components/ui/StatCard';
import { BarSeries, ChartCard } from '@/components/charts';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Card, CardHeader } from '@/components/ui/Card';

/** Admin dashboard: school-wide numbers, weekly attendance chart and fee collection. */
export function AdminDashboard() {
  const { user } = usePermissions();
  const { data, isLoading, isError, refetch } = useDashboard('admin', user?.id ?? '');

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) return <DashboardError onRetry={() => refetch()} />;

  return (
    <div>
      <WelcomeCard name={user?.name ?? 'Admin'} role="admin" scopeLabel={data.scopeLabel}>
        <div className="flex flex-wrap gap-2">
          <Link to="/classes/new">
            <Button leftIcon={<GraduationCap className="h-4 w-4" />}>Create a class</Button>
          </Link>
          <Link to="/users">
            <Button variant="outline" leftIcon={<Users className="h-4 w-4" />}>
              Manage users
            </Button>
          </Link>
        </div>
      </WelcomeCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={data.studentCount} hint="Enrolled this year" icon={<Users className="h-5 w-5" />} />
        <StatCard
          label="Teachers"
          value={data.teacherCount}
          hint="Including teacher incharges"
          icon={<UserCheck className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Classes"
          value={data.classCount}
          hint={`${data.subjectCount} subjects running`}
          icon={<GraduationCap className="h-5 w-5" />}
          tone="violet"
        />
        <StatCard
          label="Attendance"
          value={`${data.attendance.percent}%`}
          hint="Last 6 school days"
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Attendance this week"
          subtitle="Present, late and absent counts per day"
        >
          <BarSeries
            data={data.attendance.series}
            xKey="label"
            stacked
            series={[
              { key: 'present', label: 'Present', color: '#10b981' },
              { key: 'late', label: 'Late', color: '#f59e0b' },
              { key: 'absent', label: 'Absent', color: '#ef4444' },
            ]}
          />
        </ChartCard>

        <FeesSummaryCard
          collected={data.fees.collected}
          pending={data.fees.pending}
          paidCount={data.fees.paidCount}
          unpaidCount={data.fees.unpaidCount}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <TopPerformersCard students={data.topStudents} />

        <Card className="lg:col-span-2">
          <CardHeader
            title="School at a glance"
            subtitle="Quick health check of academics and finance"
            action={<TrendingUp className="h-5 w-5 text-primary-500" aria-hidden />}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Progress value={data.attendance.percent} tone="success" showLabel label="Overall attendance" />
            <Progress value={data.marks.percent} tone="primary" showLabel label="Average marks" />
            <Progress
              value={data.fees.collected + data.fees.pending ? Math.round((data.fees.collected / (data.fees.collected + data.fees.pending)) * 100) : 0}
              tone="warning"
              showLabel
              label="Fees collected"
            />
            <Progress
              value={data.quizCount ? Math.min(100, data.quizCount * 20) : 0}
              tone="primary"
              showLabel
              label="Quizzes created"
            />
          </div>
          <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {data.announcementCount} announcements published • {data.parentCount} parents connected
          </p>
        </Card>
      </div>
    </div>
  );
}
