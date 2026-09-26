import { Link } from 'react-router-dom';
import { BookOpen, ClipboardCheck, FileSpreadsheet, GraduationCap, Users } from 'lucide-react';
import { useClasses, useDashboard } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { BarSeries, ChartCard } from '@/components/charts';
import { classLabel } from '@/lib/lookups';
import { DashboardError, DashboardSkeleton, TodayScheduleCard, TopPerformersCard, WelcomeCard } from './shared';

/** Teacher dashboard: my classes and periods, marks by subject, quick actions. */
export function TeacherDashboard() {
  const { user } = usePermissions();
  const { data, isLoading, isError, refetch } = useDashboard('teacher', user?.id ?? '');
  const { data: classes = [] } = useClasses();

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) return <DashboardError onRetry={() => refetch()} />;

  const myClasses = classes.filter((classRoom) => (user?.classIds ?? []).includes(classRoom.id));

  return (
    <div>
      <WelcomeCard name={user?.name ?? 'Teacher'} role="teacher" scopeLabel={`${myClasses.length} classes • ${data.scopeLabel}`}>
        <div className="flex flex-wrap gap-2">
          <Link to="/attendance">
            <Button leftIcon={<ClipboardCheck className="h-4 w-4" />}>Take attendance</Button>
          </Link>
          <Link to="/quizzes/new">
            <Button variant="outline" leftIcon={<FileSpreadsheet className="h-4 w-4" />}>
              Create quiz
            </Button>
          </Link>
        </div>
      </WelcomeCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="My classes" value={myClasses.length} hint="You teach here" icon={<BookOpen className="h-5 w-5" />} />
        <StatCard label="My students" value={data.studentCount} hint="Across those classes" icon={<Users className="h-5 w-5" />} tone="emerald" />
        <StatCard
          label="Attendance"
          value={`${data.attendance.percent}%`}
          hint={`${data.attendance.late} late arrivals`}
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard label="Quizzes" value={data.quizCount} hint="In your classes" icon={<FileSpreadsheet className="h-5 w-5" />} tone="violet" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2" title="Marks by subject" subtitle="Average percentage in your classes">
          <BarSeries
            data={data.marks.bySubject.map((subject) => ({ label: subject.label, value: subject.value }))}
            xKey="label"
            valueSuffix="%"
            series={[{ key: 'value', label: 'Average %', color: '#10b981' }]}
          />
        </ChartCard>

        <TodayScheduleCard periods={data.todayPeriods} title="My periods today" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Classes I teach"
            subtitle="Jump straight into attendance, quizzes or marks"
            action={<GraduationCap className="h-5 w-5 text-primary-500" aria-hidden />}
          />
          <ul className="space-y-3">
            {myClasses.map((classRoom) => (
              <li key={classRoom.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{classLabel(classRoom)}</p>
                    <p className="text-xs text-slate-500">
                      {classRoom.studentIds.length} students • {classRoom.room ?? 'Room TBD'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/attendance?classId=${classRoom.id}`}>
                      <Button size="sm" variant="outline">
                        Attendance
                      </Button>
                    </Link>
                    <Link to={`/marks?classId=${classRoom.id}`}>
                      <Button size="sm" variant="outline">
                        Marks
                      </Button>
                    </Link>
                  </div>
                </div>
              </li>
            ))}
            {myClasses.length === 0 && <li className="py-6 text-center text-sm text-slate-500">No classes assigned yet.</li>}
          </ul>
        </Card>

        <TopPerformersCard students={data.topStudents} title="My top students" />
      </div>
    </div>
  );
}
