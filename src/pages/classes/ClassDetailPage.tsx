import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, CalendarDays, ClipboardCheck, GraduationCap, Plus, Trash2, Users } from 'lucide-react';
import type { TimetableSlot } from '@/types';
import { useClasses, useClass, useSubjects, useTimetable, useUpdateClass, useUsers } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { DAYS, PERIODS } from '@/lib/constants';
import { classLabel, subjectColor, subjectName, userName } from '@/lib/lookups';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Avatar, PersonCell } from '@/components/ui/Avatar';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Input';
import { SkeletonCards, SkeletonTable } from '@/components/ui/Skeleton';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { DataTable, type Column } from '@/components/ui/Table';
import { useToast } from '@/components/ui/Toast';
import type { User } from '@/types';

type TabId = 'students' | 'teachers' | 'subjects' | 'timetable';

/** Class detail: who is in it, who teaches what, and the weekly grid. */
export default function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const { can } = usePermissions();
  const toast = useToast();
  const { data: classRoom, isLoading, isError, refetch } = useClass(classId);
  const { data: users = [] } = useUsers();
  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjects();
  const { data: allSlots = [] } = useTimetable(classId);
  const updateClass = useUpdateClass();

  const [tab, setTab] = useState<TabId>('students');
  const [memberModal, setMemberModal] = useState<'students' | 'teachers' | null>(null);
  const [selection, setSelection] = useState<string[]>([]);

  const canManage = can('classes.manage');

  const classStudents = useMemo(
    () => users.filter((user) => (classRoom?.studentIds ?? []).includes(user.id)),
    [classRoom?.studentIds, users],
  );
  const classTeachers = useMemo(
    () => users.filter((user) => (classRoom?.teacherIds ?? []).includes(user.id)),
    [classRoom?.teacherIds, users],
  );
  const availableStudents = useMemo(
    () => users.filter((user) => user.role === 'student' && !(classRoom?.studentIds ?? []).includes(user.id)),
    [classRoom?.studentIds, users],
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        <SkeletonCards count={4} height="h-24" />
        <SkeletonTable rows={5} columns={4} />
      </div>
    );
  }

  if (isError || !classRoom) {
    return <ErrorState title="Class not found" description="This class may have been deleted." onRetry={() => refetch()} />;
  }

  const slotFor = (day: TimetableSlot['day'], period: number) =>
    allSlots.find((slot) => slot.day === day && slot.period === period);

  const saveMembers = async () => {
    if (!memberModal) return;
    const payload =
      memberModal === 'students'
        ? { studentIds: [...classRoom.studentIds, ...selection] }
        : { teacherIds: [...classRoom.teacherIds, ...selection] };
    try {
      await updateClass.mutateAsync({ id: classRoom.id, input: payload });
      toast.success(
        memberModal === 'students' ? 'Students added' : 'Teachers added',
        `${selection.length} ${memberModal} linked to ${classLabel(classRoom)}.`,
      );
      setMemberModal(null);
      setSelection([]);
    } catch (error) {
      toast.error('Could not update the class', error instanceof Error ? error.message : undefined);
    }
  };

  const removeStudent = async (student: User) => {
    try {
      await updateClass.mutateAsync({
        id: classRoom.id,
        input: { studentIds: classRoom.studentIds.filter((id) => id !== student.id) },
      });
      toast.success('Student removed', `${student.name} is no longer in ${classLabel(classRoom)}.`);
    } catch (error) {
      toast.error('Could not remove the student', error instanceof Error ? error.message : undefined);
    }
  };

  const removeTeacher = async (teacher: User) => {
    try {
      await updateClass.mutateAsync({
        id: classRoom.id,
        input: {
          teacherIds: classRoom.teacherIds.filter((id) => id !== teacher.id),
          inchargeId: classRoom.inchargeId === teacher.id ? null : classRoom.inchargeId,
          subjectIncharges: Object.fromEntries(
            Object.entries(classRoom.subjectIncharges).map(([subjectId, teacherId]) => [
              subjectId,
              teacherId === teacher.id ? null : teacherId,
            ]),
          ),
        },
      });
      toast.success('Teacher removed', `${teacher.name} was unassigned from this class.`);
    } catch (error) {
      toast.error('Could not remove the teacher', error instanceof Error ? error.message : undefined);
    }
  };

  const studentColumns: Array<Column<User>> = [
    {
      key: 'name',
      header: 'Student',
      sortValue: (row) => row.name,
      render: (row) => <PersonCell name={row.name} subtitle={row.email} color={row.avatarColor} />,
    },
    { key: 'roll', header: 'Roll no.', sortValue: (row) => row.rollNo ?? '', render: (row) => <span className="text-xs text-slate-600">{row.rollNo ?? '—'}</span> },
    {
      key: 'guardian',
      header: 'Guardian',
      render: (row) => (
        <span className="text-xs text-slate-600">
          {(row.parentIds ?? []).map((id) => userName(users, id)).join(', ') || 'Not linked'}
        </span>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            render: (row: User) => (
              <div className="flex justify-end">
                <IconButton
                  label={`Remove ${row.name}`}
                  size="sm"
                  variant="ghost"
                  onClick={() => void removeStudent(row)}
                >
                  <Trash2 className="h-4 w-4 text-rose-500" aria-hidden />
                </IconButton>
              </div>
            ),
          } satisfies Column<User>,
        ]
      : []),
  ];
  return (
    <div>
      <PageHeader
        title={classLabel(classRoom)}
        description={`${classRoom.room ?? 'Room not set'} • ${classStudents.length} students • ${classTeachers.length} teachers`}
        icon={<GraduationCap className="h-5 w-5" aria-hidden />}
        crumbs={[{ label: 'Classes', to: '/classes' }, { label: classLabel(classRoom) }]}
        actions={
          <>
            <Link to={`/attendance?classId=${classRoom.id}`}>
              <Button variant="outline" leftIcon={<ClipboardCheck className="h-4 w-4" />}>
                Attendance
              </Button>
            </Link>
            <Link to={`/timetable?classId=${classRoom.id}`}>
              <Button variant="outline" leftIcon={<CalendarDays className="h-4 w-4" />}>
                Timetable
              </Button>
            </Link>
            <Link to={`/marks?classId=${classRoom.id}`}>
              <Button leftIcon={<BookOpen className="h-4 w-4" />}>Marks</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={classStudents.length} hint="Enrolled in this class" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Teachers" value={classTeachers.length} hint="Assigned to this class" icon={<Users className="h-5 w-5" />} tone="emerald" />
        <StatCard label="Subjects" value={classRoom.subjectIds.length} hint="Taught this year" icon={<BookOpen className="h-5 w-5" />} tone="violet" />
        <Card className="flex items-center gap-3">
          <Avatar
            name={userName(users, classRoom.inchargeId)}
            color={users.find((item) => item.id === classRoom.inchargeId)?.avatarColor}
          />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-500">Teacher incharge</p>
            <p className="truncate text-sm font-semibold text-slate-900">{userName(users, classRoom.inchargeId)}</p>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Tabs
            ariaLabel="Class sections"
            value={tab}
            onChange={(id) => setTab(id as TabId)}
            items={[
              { id: 'students', label: 'Students', badge: classStudents.length, icon: <Users className="h-4 w-4" /> },
              { id: 'teachers', label: 'Teachers', badge: classTeachers.length, icon: <Users className="h-4 w-4" /> },
              { id: 'subjects', label: 'Subjects', badge: classRoom.subjectIds.length, icon: <BookOpen className="h-4 w-4" /> },
              { id: 'timetable', label: 'Timetable', icon: <CalendarDays className="h-4 w-4" /> },
            ]}
          />
          <div className="mt-4">
            {tab === 'students' && (
              <>
                {canManage && (
                  <div className="mb-4 flex justify-end">
                    <Button
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => {
                        setSelection([]);
                        setMemberModal('students');
                      }}
                    >
                      Add students
                    </Button>
                  </div>
                )}
                <DataTable
                  columns={studentColumns}
                  rows={classStudents}
                  rowKey={(row) => row.id}
                  emptyTitle="No students in this class yet"
                  emptyDescription="Add students from the school user list to get started."
                />
              </>
            )}

            {tab === 'teachers' && (
              <>
                {canManage && (
                  <div className="mb-4 flex justify-end">
                    <Button
                      size="sm"
                      leftIcon={<Plus className="h-4 w-4" />}
                      onClick={() => {
                        setSelection([]);
                        setMemberModal('teachers');
                      }}
                    >
                      Add teachers
                    </Button>
                  </div>
                )}
                <ul className="divide-y divide-slate-100">
                  {classTeachers.map((teacher) => (
                    <li key={teacher.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <PersonCell
                        name={teacher.name}
                        subtitle={teacher.designation ?? 'Teacher'}
                        color={teacher.avatarColor}
                      />
                      <div className="flex items-center gap-2">
                        {classRoom.inchargeId === teacher.id && <Badge tone="success">Class incharge</Badge>}
                        {canManage && (
                          <IconButton
                            label={`Remove ${teacher.name}`}
                            size="sm"
                            variant="ghost"
                            onClick={() => void removeTeacher(teacher)}
                          >
                            <Trash2 className="h-4 w-4 text-rose-500" aria-hidden />
                          </IconButton>
                        )}
                      </div>
                    </li>
                  ))}
                  {classTeachers.length === 0 && (
                    <li className="py-6 text-center text-sm text-slate-500">No teachers assigned yet.</li>
                  )}
                </ul>
              </>
            )}
            {tab === 'subjects' && (
              <ul className="divide-y divide-slate-100">
                {classRoom.subjectIds.map((subjectId) => (
                  <li key={subjectId} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="h-9 w-1.5 rounded-full"
                        style={{ backgroundColor: subjectColor(subjects, subjectId) }}
                        aria-hidden
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{subjectName(subjects, subjectId)}</p>
                        <p className="text-xs text-slate-500">
                          Incharge: {userName(users, classRoom.subjectIncharges[subjectId])}
                        </p>
                      </div>
                    </div>
                    <Link to="/subjects">
                      <Button size="sm" variant="ghost">
                        Manage subjects
                      </Button>
                    </Link>
                  </li>
                ))}
                {classRoom.subjectIds.length === 0 && (
                  <li className="py-6 text-center text-sm text-slate-500">No subjects assigned yet.</li>
                )}
              </ul>
            )}

            {tab === 'timetable' && (
              <div className="scroll-slim overflow-x-auto">
                <table className="w-full min-w-[36rem] border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border-b border-slate-200 bg-slate-50/80 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Period
                      </th>
                      {DAYS.map((day) => (
                        <th
                          key={day}
                          className="border-b border-slate-200 bg-slate-50/80 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map((period) => (
                      <tr key={period.number}>
                        <td className="border-b border-slate-100 px-3 py-2 align-top">
                          <p className="text-xs font-semibold text-slate-700">{period.label}</p>
                          <p className="text-[11px] text-slate-400">
                            {period.start}–{period.end}
                          </p>
                        </td>
                        {DAYS.map((day) => {
                          const slot = slotFor(day, period.number);
                          return (
                            <td key={`${day}-${period.number}`} className="border-b border-slate-100 px-2 py-2 align-top">
                              {slot ? (
                                <div className="rounded-md border border-slate-200 p-2">
                                  <p className="text-xs font-medium text-slate-800">
                                    {subjectName(subjects, slot.subjectId)}
                                  </p>
                                  <p className="text-[11px] text-slate-500">{userName(users, slot.teacherId)}</p>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">Free</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}


          </div>
        </Card>

        <Card>
          <CardHeader title="Class incharge & subject leads" subtitle="Change owners without rebuilding the class" />
          <div className="space-y-4">
            <Select
              label="Teacher incharge"
              disabled={!canManage}
              placeholder="Not assigned"
              options={classTeachers.map((teacher) => ({ label: teacher.name, value: teacher.id }))}
              value={classRoom.inchargeId ?? ''}
              onChange={async (event) => {
                try {
                  await updateClass.mutateAsync({ id: classRoom.id, input: { inchargeId: event.target.value || null } });
                  toast.success('Teacher incharge updated');
                } catch (error) {
                  toast.error('Could not update the incharge', error instanceof Error ? error.message : undefined);
                }
              }}
            />

            {classRoom.subjectIds.map((subjectId) => (
              <Select
                key={subjectId}
                label={`${subjectName(subjects, subjectId)} incharge`}
                disabled={!canManage}
                placeholder="Not assigned"
                options={classTeachers.map((teacher) => ({ label: teacher.name, value: teacher.id }))}
                value={classRoom.subjectIncharges[subjectId] ?? ''}
                onChange={async (event) => {
                  try {
                    await updateClass.mutateAsync({
                      id: classRoom.id,
                      input: {
                        subjectIncharges: { ...classRoom.subjectIncharges, [subjectId]: event.target.value || null },
                      },
                    });
                    toast.success('Subject incharge updated');
                  } catch (error) {
                    toast.error('Could not update the subject lead', error instanceof Error ? error.message : undefined);
                  }
                }}
              />
            ))}
          </div>
        </Card>
      </div>
      <Modal
        open={Boolean(memberModal)}
        onClose={() => setMemberModal(null)}
        title={memberModal === 'students' ? 'Add students to this class' : 'Add teachers to this class'}
        description={
          memberModal === 'students'
            ? 'Pick students from the school list. They stay in the system even if removed later.'
            : 'Selected teachers can take attendance, add marks and create quizzes for this class.'
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setMemberModal(null)}>
              Cancel
            </Button>
            <Button onClick={saveMembers} loading={updateClass.isPending} disabled={selection.length === 0}>
              {memberModal === 'students' ? 'Add students' : 'Add teachers'}
            </Button>
          </>
        }
      >
        <MultiSelect
          options={
            memberModal === 'students'
              ? availableStudents.map((student) => ({
                  id: student.id,
                  label: student.name,
                  description: `${student.rollNo ?? 'No roll no.'} • ${
                    classes.find((item) => item.id === student.classId)?.name ?? 'Not in a class'
                  }`,
                  color: student.avatarColor,
                }))
              : users
                  .filter((user) => (user.role === 'teacher' || user.role === 'teacher_incharge') && !classRoom.teacherIds.includes(user.id))
                  .map((teacher) => ({
                    id: teacher.id,
                    label: teacher.name,
                    description: teacher.designation ?? 'Teacher',
                    color: teacher.avatarColor,
                  }))
          }
          selected={selection}
          onChange={setSelection}
          searchPlaceholder={memberModal === 'students' ? 'Search students' : 'Search teachers'}
          emptyText="Everybody is already in this class."
        />
      </Modal>
    </div>
  );
}
