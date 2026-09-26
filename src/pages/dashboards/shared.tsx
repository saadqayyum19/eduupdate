import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, TrendingUp, Trophy } from 'lucide-react';
import { useSubjects } from '@/services/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton, SkeletonCards, SkeletonText } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Card, CardHeader } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/constants';
import type { PeriodRow } from '@/services/api';
import type { Role } from '@/types';

/** Shared dashboard chrome so all seven role dashboards stay consistent. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full" />
      <SkeletonCards count={4} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export function DashboardError({ onRetry }: { onRetry: () => void }) {
  return <ErrorState description="We could not load your dashboard data." onRetry={onRetry} />;
}

/** Greeting banner: name, role, scope and today's date. */
export function WelcomeCard({
  name,
  role,
  scopeLabel,
  children,
}: {
  name: string;
  role: Role;
  scopeLabel: string;
  children?: ReactNode;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-md border border-primary-100 bg-gradient-to-r from-primary-50 to-white p-5"
    >
      <div className="flex items-center gap-4">
        <Avatar name={name} size="lg" />
        <div>
          <p className="text-sm text-slate-500">{formatDate(new Date())}</p>
          <h1 className="text-xl font-semibold text-slate-900">
            {greeting}, {name.split(' ')[0]}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <Badge tone="primary">{ROLE_LABELS[role]}</Badge>
            <span>{scopeLabel}</span>
          </p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

/** Today's P1–P6 schedule (teacher, student and parent dashboards). */
export function TodayScheduleCard({ periods, title = "Today's periods" }: { periods: PeriodRow[]; title?: string }) {
  const { data: subjects = [] } = useSubjects();
  const subjectName = (id: string) => subjects.find((subject) => subject.id === id)?.name ?? 'Free period';

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle="Periods P1 to P6"
        action={<CalendarDays className="h-5 w-5 text-slate-400" aria-hidden />}
      />
      {periods.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" aria-hidden />}
          title="No periods scheduled today"
          description="Enjoy the break — or set up your class timetable."
          className="py-8"
        />
      ) : (
        <ul className="space-y-2">
          {periods.map((period) => (
            <li
              key={`${period.period}-${period.subjectId}`}
              className="flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2.5"
            >
              <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-primary-700 shadow-card">
                {period.period}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800">{subjectName(period.subjectId)}</span>
                <span className="block text-xs text-slate-500">
                  {period.time} • {period.className}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Top performers list with animated percentage bars. */
export function TopPerformersCard({
  students,
  title = 'Top performers',
}: {
  students: Array<{ id: string; name: string; percent: number }>;
  title?: string;
}) {
  return (
    <Card>
      <CardHeader
        title={title}
        subtitle="Across all recorded exams"
        action={<Trophy className="h-5 w-5 text-amber-500" aria-hidden />}
      />
      {students.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">No marks recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {students.map((student, index) => (
            <li key={student.id} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-800">{student.name}</span>
                  <span className="text-sm font-semibold text-slate-700">{student.percent}%</span>
                </span>
                <Progress
                  className="mt-1.5"
                  value={student.percent}
                  tone={student.percent >= 75 ? 'success' : 'primary'}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Fee collection summary card (admin, principal and parent dashboards). */
export function FeesSummaryCard({
  collected,
  pending,
  paidCount,
  unpaidCount,
}: {
  collected: number;
  pending: number;
  paidCount: number;
  unpaidCount: number;
}) {
  const total = collected + pending;
  const percent = total ? Math.round((collected / total) * 100) : 0;

  return (
    <Card>
      <CardHeader
        title="Fee collection"
        subtitle={`${paidCount} paid • ${unpaidCount} pending`}
        action={<TrendingUp className="h-5 w-5 text-emerald-500" aria-hidden />}
      />
      <p className="text-2xl font-semibold text-slate-900">{formatCurrency(collected)}</p>
      <p className="mt-0.5 text-xs text-slate-500">of {formatCurrency(total)} billed</p>
      <Progress className="mt-4" value={percent} tone="success" showLabel label="Collected" />
      <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
        {formatCurrency(pending)} still to be collected
      </p>
      <Link to="/fees" className="mt-4 inline-block rounded text-sm font-medium text-primary-700 hover:underline">
        Open fees module →
      </Link>
    </Card>
  );
}

/** Placeholder card shown while a supporting panel loads. */
export function PanelSkeleton() {
  return (
    <Card>
      <SkeletonText lines={2} className="mb-4" />
      <SkeletonText lines={4} />
    </Card>
  );
}

