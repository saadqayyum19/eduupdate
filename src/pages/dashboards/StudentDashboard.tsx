import { Link } from 'react-router-dom';
import { BookOpen, CalendarDays, FileSpreadsheet, Trophy } from 'lucide-react';
import { useClasses, useDashboard, useMySubmissions, useQuizzes } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { BarSeries, ChartCard, DonutChart } from '@/components/charts';
import { classLabel } from '@/lib/lookups';
import { formatDate } from '@/lib/utils';
import { DashboardError, DashboardSkeleton, TodayScheduleCard, WelcomeCard } from './shared';

/** Student dashboard: my attendance, my marks, my quizzes and today's routine. */
export function StudentDashboard() {
  const { user } = usePermissions();
  const { data, isLoading, isError, refetch } = useDashboard('student', user?.id ?? '');
  const { data: classes = [] } = useClasses();
  const { data: quizzes = [] } = useQuizzes({ classId: user?.classId });
  const { data: submissions = [] } = useMySubmissions(user?.id);

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) return <DashboardError onRetry={() => refetch()} />;

  const classRoom = classes.find((item) => item.id === user?.classId);
  const myQuizStatus = (quizId: string) => submissions.find((item) => item.quizId === quizId);

  return (
    <div>
      <WelcomeCard
        name={user?.name ?? 'Student'}
        role="student"
        scopeLabel={`${classLabel(classRoom)} • Roll ${user?.rollNo ?? '—'}`}
      >
        <Link to="/quizzes">
          <Button leftIcon={<FileSpreadsheet className="h-4 w-4" />}>My quizzes</Button>
        </Link>
      </WelcomeCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My attendance"
          value={`${data.attendance.percent}%`}
          hint={`${data.attendance.present} present • ${data.attendance.absent} absent`}
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <StatCard label="Average marks" value={`${data.marks.percent}%`} hint="Across all subjects" icon={<BookOpen className="h-5 w-5" />} tone="emerald" />
        <StatCard label="Subjects" value={data.subjectCount} hint="In my class" icon={<BookOpen className="h-5 w-5" />} tone="violet" />
        <StatCard
          label="Class rank"
          value={
            data.topStudents.length
              ? `#${Math.max(1, data.topStudents.findIndex((item) => item.id === user?.id) + 1)}`
              : '—'
          }
          hint={`of ${data.studentCount} students`}
          icon={<Trophy className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <ChartCard className="lg:col-span-2" title="My marks by subject" subtitle="Average percentage per subject">
          <BarSeries
            data={data.marks.bySubject.map((subject) => ({ label: subject.label, value: subject.value }))}
            xKey="label"
            valueSuffix="%"
            series={[{ key: 'value', label: 'My average %', color: '#2563eb' }]}
          />
        </ChartCard>

        <ChartCard title="My attendance" subtitle="Present, late and absent days">
          <DonutChart
            data={[
              { label: 'Present', value: data.attendance.present },
              { label: 'Late', value: data.attendance.late },
              { label: 'Absent', value: data.attendance.absent },
            ]}
            colors={['#10b981', '#f59e0b', '#ef4444']}
          />
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <TodayScheduleCard periods={data.todayPeriods} title="My routine today" />

        <Card>
          <CardHeader
            title="Assigned quizzes"
            subtitle="Quizzes shared with my class"
            action={
              <Link to="/quizzes">
                <Button variant="ghost" size="sm">
                  Open
                </Button>
              </Link>
            }
          />
          <ul className="divide-y divide-slate-100">
            {quizzes.map((quiz) => {
              const submission = myQuizStatus(quiz.id);
              const status = submission ? (submission.score === null ? 'pending' : 'success') : 'draft';
              return (
                <li key={quiz.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{quiz.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(quiz.date)} • {quiz.totalMarks} marks • {quiz.durationMin} min
                    </p>
                  </div>
                  <Badge tone={statusTone(status)}>
                    {submission ? (submission.score === null ? 'Submitted' : `Scored ${submission.score}`) : 'Not attempted'}
                  </Badge>
                </li>
              );
            })}
            {quizzes.length === 0 && <li className="py-6 text-center text-sm text-slate-500">No quizzes assigned yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
