import { Link } from 'react-router-dom';
import { BookOpen, CalendarDays, Wallet } from 'lucide-react';
import { useClasses, useDashboard, useUsers } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { BarSeries, ChartCard } from '@/components/charts';
import { classLabel } from '@/lib/lookups';
import { formatCurrency } from '@/lib/utils';
import { DashboardError, DashboardSkeleton, FeesSummaryCard, TodayScheduleCard, WelcomeCard } from './shared';

/** Parent dashboard: my child's attendance, marks and fees. */
export function ParentDashboard() {
  const { user } = usePermissions();
  const { data, isLoading, isError, refetch } = useDashboard('parent', user?.id ?? '');
  const { data: classes = [] } = useClasses();
  const { data: users = [] } = useUsers();

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) return <DashboardError onRetry={() => refetch()} />;

  const child = users.find((item) => item.id === user?.childIds?.[0]);
  const classRoom = classes.find((item) => item.id === child?.classId);

  return (
    <div>
      <WelcomeCard
        name={user?.name ?? 'Parent'}
        role="parent"
        scopeLabel={child ? `${child.name} • ${classLabel(classRoom)}` : 'No child linked yet'}
      >
        <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
          <Avatar name={child?.name ?? 'Child'} color={child?.avatarColor} />
          <div>
            <p className="text-sm font-medium text-slate-800">{child?.name ?? 'Child'}</p>
            <p className="text-xs text-slate-500">Roll {child?.rollNo ?? '—'}</p>
          </div>
        </div>
      </WelcomeCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Attendance"
          value={`${data.attendance.percent}%`}
          hint={`${data.attendance.absent} absences this week`}
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <StatCard label="Average marks" value={`${data.marks.percent}%`} hint="Across all subjects" icon={<BookOpen className="h-5 w-5" />} tone="emerald" />
        <StatCard
          label="Fees pending"
          value={formatCurrency(data.fees.pending)}
          hint={`${data.fees.unpaidCount} invoices open`}
          icon={<Wallet className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard label="Quizzes" value={data.quizCount} hint="For this class" icon={<BookOpen className="h-5 w-5" />} tone="violet" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2" title="Subject performance" subtitle={`${child?.name ?? 'Your child'}'s average per subject`}>
          <BarSeries
            data={data.marks.bySubject.map((subject) => ({ label: subject.label, value: subject.value }))}
            xKey="label"
            valueSuffix="%"
            series={[{ key: 'value', label: 'Average %', color: '#8b5cf6' }]}
          />
        </ChartCard>

        <FeesSummaryCard
          collected={data.fees.collected}
          pending={data.fees.pending}
          paidCount={data.fees.paidCount}
          unpaidCount={data.fees.unpaidCount}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <TodayScheduleCard periods={data.todayPeriods} title="Child's routine today" />

        <Card>
          <CardHeader title="Attendance this week" subtitle="Day by day for the last school week" />
          <ul className="space-y-2">
            {data.attendance.series.map((day) => (
              <li key={day.label} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-700">{day.label}</span>
                <span className="flex gap-2 text-xs">
                  {day.present > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Present</span>}
                  {day.late > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Late</span>}
                  {day.absent > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">Absent</span>}
                </span>
              </li>
            ))}
          </ul>
          <Link to="/fees" className="mt-4 inline-block">
            <Button variant="outline" size="sm" leftIcon={<Wallet className="h-4 w-4" />}>
              View fee invoices
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}
