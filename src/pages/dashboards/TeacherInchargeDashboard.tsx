import { Link } from 'react-router-dom';
import { BookOpen, ClipboardCheck, FileSpreadsheet, Plus, Users } from 'lucide-react';
import { useClasses, useDashboard, useUsers } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { BarSeries, ChartCard } from '@/components/charts';
import { classLabel, userName } from '@/lib/lookups';
import { DashboardError, DashboardSkeleton, TodayScheduleCard, WelcomeCard } from './shared';

/** Teacher incharge dashboard: own classes, subject averages, today's periods. */
export function TeacherInchargeDashboard() {
  const { user } = usePermissions();
  const { data, isLoading, isError, refetch } = useDashboard('teacher_incharge', user?.id ?? '');
  const { data: classes = [] } = useClasses();
  const { data: users = [] } = useUsers();

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) return <DashboardError onRetry={() => refetch()} />;

  const myClasses = classes.filter((classRoom) => (user?.classIds ?? []).includes(classRoom.id));

  return (
    <div>
      <WelcomeCard
        name={user?.name ?? 'Teacher Incharge'}
        role="teacher_incharge"
        scopeLabel={`${myClasses.length} classes • ${data.scopeLabel}`}
      >
        <div className="flex flex-wrap gap-2">
          <Link to="/classes/new">
            <Button leftIcon={<Plus className="h-4 w-4" />}>Create class</Button>
          </Link>
          <Link to="/quizzes/new">
            <Button variant="outline" leftIcon={<FileSpreadsheet className="h-4 w-4" />}>
              New quiz
            </Button>
          </Link>
        </div>
      </WelcomeCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="My classes" value={myClasses.length} hint="You are the incharge" icon={<BookOpen className="h-5 w-5" />} />
        <StatCard
          label="My students"
          value={data.studentCount}
          hint="Across your classes"
          icon={<Users className="h-5 w-5" />}
          tone="emerald"
        />
        <StatCard
          label="Attendance"
          value={`${data.attendance.percent}%`}
          hint="Last 6 school days"
          icon={<ClipboardCheck className="h-5 w-5" />}
          tone="amber"
        />
        <StatCard label="Quizzes" value={data.quizCount} hint="In your classes" icon={<FileSpreadsheet className="h-5 w-5" />} tone="violet" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Subject averages"
          subtitle="Average marks per subject in your classes"
        >
          <BarSeries
            data={data.marks.bySubject.map((subject) => ({ label: subject.label, value: subject.value }))}
            xKey="label"
            valueSuffix="%"
            series={[{ key: 'value', label: 'Average %', color: '#2563eb' }]}
          />
        </ChartCard>

        <TodayScheduleCard periods={data.todayPeriods} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="My classes"
            subtitle="Students, teachers and subjects you manage"
            action={
              <Link to="/classes">
                <Button variant="ghost" size="sm">
                  Manage
                </Button>
              </Link>
            }
          />
          {myClasses.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">You are not incharge of a class yet.</p>
          ) : (
            <ul className="space-y-3">
              {myClasses.map((classRoom) => (
                <li key={classRoom.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{classLabel(classRoom)}</p>
                      <p className="text-xs text-slate-500">
                        {classRoom.studentIds.length} students • {classRoom.subjectIds.length} subjects
                      </p>
                    </div>
                    <Badge tone="primary">Incharge: {userName(users, classRoom.inchargeId)}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Teachers: {classRoom.teacherIds.map((id) => userName(users, id)).join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Attendance quick check" subtitle="Latest marked day per class" />
          <ul className="space-y-2">
            {myClasses.map((classRoom) => (
              <li key={classRoom.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                <span className="text-sm text-slate-700">{classLabel(classRoom)}</span>
                <Link to={`/attendance?classId=${classRoom.id}`}>
                  <Button variant="outline" size="sm">
                    Take attendance
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Attendance for today is {data.attendance.series.at(-1)?.present ?? 0} present,{' '}
            {data.attendance.series.at(-1)?.absent ?? 0} absent.
          </p>
        </Card>
      </div>
    </div>
  );
}
