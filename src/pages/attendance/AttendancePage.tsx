import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Save,
  Users,
  XCircle,
} from 'lucide-react';
import type { AttendanceStatus, ClassRoom, User } from '@/types';
import { useAttendance, useClasses, useSaveRoster, useUsers } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { ATTENDANCE_STATUSES } from '@/lib/constants';
import { attendanceSummary, classLabel } from '@/lib/lookups';
import { cn, today } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input, Select } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonCards } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';

const STATUS_ICONS: Record<AttendanceStatus, typeof CheckCircle2> = {
  present: CheckCircle2,
  absent: XCircle,
  late: Clock,
};

const STATUS_STYLES: Record<AttendanceStatus, { bg: string; border: string; text: string; activeBg: string }> = {
  present: {
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    border: 'border-emerald-300',
    text: 'text-emerald-700',
    activeBg: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
  },
  late: {
    bg: 'bg-amber-50 hover:bg-amber-100',
    border: 'border-amber-300',
    text: 'text-amber-700',
    activeBg: 'bg-amber-500 text-white border-amber-500 shadow-sm',
  },
  absent: {
    bg: 'bg-rose-50 hover:bg-rose-100',
    border: 'border-rose-300',
    text: 'text-rose-700',
    activeBg: 'bg-rose-600 text-white border-rose-600 shadow-sm',
  },
};

export default function AttendancePage() {
  const [params, setParams] = useSearchParams();
  const { can, user } = usePermissions();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(() => today());

  const canTake = can('attendance.take');

  const { data: classes = [], isLoading: classesLoading, isError: classesError } = useClasses();
  const { data: allUsers = [] } = useUsers();

  // Role filtering
  const visibleClasses = useMemo(() => {
    if (user?.role === 'student' && user.classId) {
      return classes.filter((c) => c.id === user.classId);
    }
    if (user?.role === 'parent' && user.childIds?.length) {
      const children = allUsers.filter((u) => user.childIds?.includes(u.id));
      const childClassIds = new Set(children.map((c) => c.classId).filter(Boolean));
      return classes.filter((c) => childClassIds.has(c.id));
    }
    if (user?.role === 'teacher' && user.classIds?.length) {
      return classes.filter((c) => user.classIds?.includes(c.id));
    }
    return classes;
  }, [classes, user, allUsers]);

  const activeClassId = params.get('classId') || visibleClasses[0]?.id || '';
  const activeClass: ClassRoom | undefined = visibleClasses.find((c) => c.id === activeClassId);

  const studentsInClass: User[] = useMemo(() => {
    if (!activeClass) return [];
    return allUsers
      .filter((u) => u.role === 'student' && activeClass.studentIds.includes(u.id))
      .sort((a, b) => (a.rollNo || '').localeCompare(b.rollNo || ''));
  }, [allUsers, activeClass]);

  const {
    data: allClassAttendance = [],
    isLoading: attendanceLoading,
    isError: attendanceError,
    refetch,
  } = useAttendance({ classId: activeClassId });

  const saveRosterMutation = useSaveRoster();

  // Local daily entries state
  const [localEntries, setLocalEntries] = useState<Record<string, { status: AttendanceStatus; note: string }>>({});

  useEffect(() => {
    if (attendanceLoading || !activeClassId) return;
    const dayRecords = allClassAttendance.filter((r) => r.date === selectedDate);
    const initial: Record<string, { status: AttendanceStatus; note: string }> = {};

    studentsInClass.forEach((st) => {
      const rec = dayRecords.find((r) => r.studentId === st.id);
      initial[st.id] = {
        status: rec ? rec.status : 'present',
        note: rec?.note || '',
      };
    });

    setLocalEntries(initial);
  }, [activeClassId, selectedDate, attendanceLoading, allClassAttendance, studentsInClass]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setLocalEntries((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleNoteChange = (studentId: string, note: string) => {
    setLocalEntries((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        note,
      },
    }));
  };

  const markAll = (status: AttendanceStatus) => {
    setLocalEntries((prev) => {
      const updated = { ...prev };
      studentsInClass.forEach((st) => {
        updated[st.id] = {
          ...updated[st.id],
          status,
        };
      });
      return updated;
    });
  };

  const handleSaveRoster = async () => {
    if (!activeClassId || !selectedDate) return;
    try {
      await saveRosterMutation.mutateAsync({
        classId: activeClassId,
        date: selectedDate,
        markedBy: user?.id || 'admin',
        entries: Object.entries(localEntries).map(([studentId, data]) => ({
          studentId,
          status: data.status,
          note: data.note,
        })),
      });
      toast.success('Attendance saved', `Recorded roster for ${selectedDate} (${studentsInClass.length} students).`);
    } catch (err) {
      toast.error('Failed to save attendance', err instanceof Error ? err.message : undefined);
    }
  };

  const summary = useMemo(() => {
    const list = Object.values(localEntries).map((e) => ({
      status: e.status,
    })) as Array<{ status: AttendanceStatus }>;
    const present = list.filter((e) => e.status === 'present').length;
    const absent = list.filter((e) => e.status === 'absent').length;
    const late = list.filter((e) => e.status === 'late').length;
    const total = studentsInClass.length;
    const percent = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { present, absent, late, total, percent };
  }, [localEntries, studentsInClass]);
  // Monthly summary calculations
  const monthlyData = useMemo(() => {
    const dates = Array.from(new Set(allClassAttendance.map((r) => r.date))).sort();
    return {
      dates,
      studentStats: studentsInClass.map((student) => {
        const studentRecords = allClassAttendance.filter((r) => r.studentId === student.id);
        const stats = attendanceSummary(studentRecords);
        const dateMap = new Map(studentRecords.map((r) => [r.date, r.status]));
        return {
          student,
          stats,
          dateMap,
        };
      }),
    };
  }, [allClassAttendance, studentsInClass]);

  // Overall class average
  const overallSummary = useMemo(() => {
    return attendanceSummary(allClassAttendance);
  }, [allClassAttendance]);

  const handleExportCSV = () => {
    if (!studentsInClass.length) return;
    const headers = ['Roll No', 'Name', ...monthlyData.dates, 'Present', 'Absent', 'Late', 'Percentage'];
    const rows = monthlyData.studentStats.map(({ student, stats, dateMap }) => [
      student.rollNo || '',
      `"${student.name}"`,
      ...monthlyData.dates.map((d) => dateMap.get(d) || '-'),
      stats.present,
      stats.absent,
      stats.late,
      `${stats.percent}%`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${activeClass?.name || 'Class'}_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Tracker"
        description="Daily roster marking and comprehensive monthly attendance insights."
        icon={<ClipboardCheck className="h-5 w-5" aria-hidden />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              aria-label="Select class to view attendance"
              value={activeClassId}
              onChange={(e) => setParams({ classId: e.target.value })}
              className="w-48 text-sm"
              disabled={visibleClasses.length === 0}
              options={visibleClasses.map((c) => ({
                value: c.id,
                label: classLabel(c),
              }))}
            />
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={handleExportCSV}
              disabled={studentsInClass.length === 0}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {classesError || attendanceError ? (
        <ErrorState
          title="Could not load attendance data"
          description="Failed to load student attendance. Please try again."
          onRetry={() => refetch()}
        />
      ) : classesLoading ? (
        <SkeletonCards count={4} />
      ) : !activeClass ? (
        <Card className="p-8 text-center text-slate-500">
          No class found or no class assigned to your account.
        </Card>
      ) : (
        <>
          {/* Quick Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Overall Attendance"
              value={`${overallSummary.percent}%`}
              hint="Class average across recorded history"
              tone={overallSummary.percent >= 85 ? 'emerald' : overallSummary.percent >= 70 ? 'amber' : 'rose'}
              icon={<ClipboardCheck className="h-5 w-5" />}
            />
            <StatCard
              label="Enrolled Students"
              value={studentsInClass.length}
              hint="Total active class members"
              tone="primary"
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              label="Selected Day Present"
              value={summary.present}
              hint={`${summary.percent}% attendance on ${selectedDate}`}
              tone="emerald"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <StatCard
              label="Selected Day Absent"
              value={summary.absent}
              hint={`${summary.late} marked late`}
              tone="rose"
              icon={<XCircle className="h-5 w-5" />}
            />
          </div>

          <Card>
            <div className="border-b border-slate-100 p-4">
              <Tabs
                items={[
                  { id: 'daily', label: 'Daily Roster' },
                  { id: 'monthly', label: 'Monthly Summary' },
                ]}
                value={activeTab}
                onChange={(id) => setActiveTab(id as 'daily' | 'monthly')}
                ariaLabel="Attendance views"
              />
            </div>

            {activeTab === 'daily' ? (
              <CardBody className="p-6">
                {/* Date Picker & Quick Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-44">
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-sm font-medium"
                      />
                    </div>
                    <Badge tone="neutral" className="text-xs">
                      {studentsInClass.length} Students
                    </Badge>
                  </div>

                  {canTake && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 mr-1">Mark all:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => markAll('present')}
                      >
                        All Present
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-amber-200 text-amber-700 hover:bg-amber-50"
                        onClick={() => markAll('late')}
                      >
                        All Late
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                        onClick={() => markAll('absent')}
                      >
                        All Absent
                      </Button>

                      <div className="h-4 w-px bg-slate-200 mx-1" />

                      <Button
                        size="sm"
                        leftIcon={<Save className="h-4 w-4" />}
                        onClick={handleSaveRoster}
                        loading={saveRosterMutation.isPending}
                      >
                        Save Roster
                      </Button>
                    </div>
                  )}
                </div>

                {/* Roster Table / List */}
                {studentsInClass.length === 0 ? (
                  <EmptyState
                    title="No students in this class"
                    description="Assign students to this class in the Classes or Users module to record attendance."
                  />
                ) : (
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-3 w-16">Roll</th>
                          <th className="py-3 px-3">Student</th>
                          <th className="py-3 px-3 text-center">Status</th>
                          <th className="py-3 px-3">Remarks / Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentsInClass.map((student) => {
                          const entry = localEntries[student.id] || { status: 'present', note: '' };

                          return (
                            <tr key={student.id} className="hover:bg-slate-50/50 transition">
                              <td className="py-3 px-3 font-mono text-xs text-slate-500">
                                {student.rollNo || '—'}
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-3">
                                  <Avatar name={student.name} color={student.avatarColor} />
                                  <div>
                                    <p className="font-semibold text-slate-900 leading-none">{student.name}</p>
                                    <p className="text-xs text-slate-500 mt-1">{student.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  {ATTENDANCE_STATUSES.map((st) => {
                                    const isSelected = entry.status === st;
                                    const Icon = STATUS_ICONS[st];
                                    const style = STATUS_STYLES[st];

                                    return (
                                      <button
                                        key={st}
                                        type="button"
                                        disabled={!canTake}
                                        onClick={() => handleStatusChange(student.id, st)}
                                        className={cn(
                                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer capitalize',
                                          isSelected
                                            ? style.activeBg
                                            : cn('bg-white text-slate-600 border-slate-200 hover:border-slate-300', !canTake && 'opacity-60 cursor-default'),
                                        )}
                                      >
                                        <Icon className="h-3.5 w-3.5" />
                                        <span>{st}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="py-3 px-3 w-64">
                                <Input
                                  value={entry.note}
                                  placeholder="Optional remark…"
                                  disabled={!canTake}
                                  onChange={(e) => handleNoteChange(student.id, e.target.value)}
                                  className="text-xs h-8"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            ) : (
              <CardBody className="p-6">
                {/* Monthly Summary View */}
                {monthlyData.dates.length === 0 ? (
                  <EmptyState
                    title="No attendance records found"
                    description="Mark daily rosters to build up monthly calendar history."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold uppercase">
                          <th className="py-3 px-3 w-16 sticky left-0 bg-slate-50 z-10">Roll</th>
                          <th className="py-3 px-3 min-w-[150px] sticky left-16 bg-slate-50 z-10 shadow-sm">Student</th>
                          {monthlyData.dates.map((d) => (
                            <th key={d} className="py-3 px-2 text-center font-mono">
                              <span className="block text-[10px] text-slate-400">
                                {new Date(d).toLocaleDateString('en-GB', { weekday: 'narrow' })}
                              </span>
                              {d.slice(8)}
                            </th>
                          ))}
                          <th className="py-3 px-2 text-center text-emerald-700 bg-emerald-50/40">Pres</th>
                          <th className="py-3 px-2 text-center text-rose-700 bg-rose-50/40">Abs</th>
                          <th className="py-3 px-2 text-center text-amber-700 bg-amber-50/40">Late</th>
                          <th className="py-3 px-3 text-right">Avg %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {monthlyData.studentStats.map(({ student, stats, dateMap }) => (
                          <tr key={student.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-2.5 px-3 font-mono text-slate-500 sticky left-0 bg-white">
                              {student.rollNo || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 sticky left-16 bg-white shadow-sm">
                              {student.name}
                            </td>
                            {monthlyData.dates.map((d) => {
                              const st = dateMap.get(d);
                              return (
                                <td key={d} className="py-2 px-1 text-center">
                                  {st === 'present' ? (
                                    <span className="inline-block h-6 w-6 rounded bg-emerald-100 text-emerald-800 font-bold leading-6">
                                      P
                                    </span>
                                  ) : st === 'absent' ? (
                                    <span className="inline-block h-6 w-6 rounded bg-rose-100 text-rose-800 font-bold leading-6">
                                      A
                                    </span>
                                  ) : st === 'late' ? (
                                    <span className="inline-block h-6 w-6 rounded bg-amber-100 text-amber-800 font-bold leading-6">
                                      L
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="py-2.5 px-2 text-center font-bold text-emerald-700 bg-emerald-50/20">
                              {stats.present}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-rose-700 bg-rose-50/20">
                              {stats.absent}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-amber-700 bg-amber-50/20">
                              {stats.late}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Badge
                                tone={
                                  stats.percent >= 85
                                    ? 'success'
                                    : stats.percent >= 70
                                    ? 'warning'
                                    : 'danger'
                                }
                              >
                                {stats.percent}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            )}
          </Card>
        </>
      )}
    </div>
  );
}


