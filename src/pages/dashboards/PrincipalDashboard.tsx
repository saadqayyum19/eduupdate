import { Link } from 'react-router-dom';
import { BarChart3, CalendarClock, Megaphone, TrendingUp } from 'lucide-react';
import { useAnnouncements, useDashboard } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { AreaTrend, ChartCard } from '@/components/charts';
import { timeAgo } from '@/lib/utils';
import { DashboardError, DashboardSkeleton, TopPerformersCard, WelcomeCard } from './shared';

/** Principal dashboard: attendance trend, results health and approvals to review. */
export function PrincipalDashboard() {
  const { user } = usePermissions();
  const { data, isLoading, isError, refetch } = useDashboard('principal', user?.id ?? '');
  const { data: announcements = [] } = useAnnouncements('principal');

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) return <DashboardError onRetry={() => refetch()} />;

  const trend = data.attendance.series.map((point) => ({
    label: point.label,
    percent: point.present + point.absent + point.late
      ? Math.round(((point.present + point.late) / (point.present + point.absent + point.late)) * 100)
      : 0,
  }));

  return (
    <div>
      <WelcomeCard name={user?.name ?? 'Principal'} role="principal" scopeLabel={`${data.scopeLabel} • ${data.classCount} classes`}>
        <div className="flex flex-wrap gap-2">
          <Link to="/reports">
            <Button leftIcon={<BarChart3 className="h-4 w-4" />}>Open reports</Button>
          </Link>
          <Link to="/attendance">
            <Button variant="outline" leftIcon={<CalendarClock className="h-4 w-4" />}>
              Attendance
            </Button>
          </Link>
        </div>
      </WelcomeCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Attendance"
          value={`${data.attendance.percent}%`}
          hint={`${data.attendance.absent} absences this week`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Average marks"
          value={`${data.marks.percent}%`}
          hint="Across all subjects"
          icon={<BarChart3 className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Fees pending"
          value={data.fees.unpaidCount}
          hint="Invoices awaiting payment"
          icon={<Megaphone className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard
          label="To review"
          value={data.pendingApprovals}
          hint="High priority notices"
          icon={<CalendarClock className="h-5 w-5" />}
          tone="rose"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Attendance trend"
          subtitle="Daily attendance percentage this week"
        >
          <AreaTrend data={trend} xKey="label" valueSuffix="%" series={[{ key: 'percent', label: 'Attendance %', color: '#2563eb' }]} />
        </ChartCard>

        <TopPerformersCard students={data.topStudents} title="Best performing students" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Subject performance"
            subtitle="School average per subject"
            action={<BarChart3 className="h-5 w-5 text-primary-500" aria-hidden />}
          />
          <ul className="space-y-3">
            {data.marks.bySubject.map((subject) => (
              <li key={subject.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{subject.label}</span>
                  <span className="font-semibold text-slate-800">{subject.value}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-primary-600" style={{ width: `${subject.value}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Latest announcements"
            subtitle="Published by the school office"
            action={
              <Link to="/announcements">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            }
          />
          <ul className="divide-y divide-slate-100">
            {announcements.slice(0, 4).map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.body}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{timeAgo(item.createdAt)}</p>
                </div>
                {item.priority === 'high' && <Badge tone="danger">Important</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
