import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, Eraser, Pencil, Plus } from 'lucide-react';
import type { WeekDay } from '@/types';
import { useClasses, useClearSlot, useSubjects, useTimetable, useUpsertSlot, useUsers } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { DAYS, PERIODS } from '@/lib/constants';
import { classLabel, subjectColor, subjectName, userName } from '@/lib/lookups';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

interface CellTarget {
  day: WeekDay;
  period: number;
}

/**
 * Weekly timetable grid (Mon–Sat × P1–P6).
 * Teacher incharges / admins can click any cell to set the subject and teacher.
 */
export default function TimetablePage() {
  const [params, setParams] = useSearchParams();
  const { can, user } = usePermissions();
  const toast = useToast();

  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const { data: users = [] } = useUsers();
  const { data: subjects = [] } = useSubjects();

  const canManage = can('timetable.manage');

  /** Students and parents only see their own / their child's class. */
  const visibleClasses = useMemo(() => {
    if (user?.role === 'student') return classes.filter((classRoom) => classRoom.id === user.classId);
    if (user?.role === 'parent') {
      const childIds = user.childIds ?? [];
      const childClassIds = users.filter((item) => childIds.includes(item.id)).map((item) => item.classId);
      return classes.filter((classRoom) => childClassIds.includes(classRoom.id));
    }
    if (user?.role === 'teacher' || user?.role === 'teacher_incharge') {
      return classes.filter((classRoom) => (user.classIds ?? []).includes(classRoom.id));
    }
    return classes;
  }, [classes, user, users]);

  const activeClassId = params.get('classId') ?? visibleClasses[0]?.id ?? '';
  const activeClass = classes.find((classRoom) => classRoom.id === activeClassId);

  const { data: slots = [], isLoading, isError, refetch } = useTimetable(activeClassId || undefined);
  const upsertSlot = useUpsertSlot();
  const clearSlot = useClearSlot();

  const [cell, setCell] = useState<CellTarget | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  useEffect(() => {
    if (!activeClassId && visibleClasses[0]) {
      setParams({ classId: visibleClasses[0].id }, { replace: true });
    }
  }, [activeClassId, setParams, visibleClasses]);

  const slotFor = (day: WeekDay, period: number) => slots.find((slot) => slot.day === day && slot.period === period);

  const openCell = (day: WeekDay, period: number) => {
    if (!canManage || !activeClass) return;
    const existing = slotFor(day, period);
    setCell({ day, period });
    setSubjectId(existing?.subjectId ?? activeClass.subjectIds[0] ?? '');
    setTeacherId(existing?.teacherId ?? activeClass.inchargeId ?? '');
  };

  const saveCell = async () => {
    if (!cell || !activeClass) return;
    if (!subjectId || !teacherId) {
      toast.error('Pick a subject and a teacher', 'Both fields are needed to fill this period.');
      return;
    }
    try {
      await upsertSlot.mutateAsync({
        classId: activeClass.id,
        day: cell.day,
        period: cell.period,
        subjectId,
        teacherId,
        room: activeClass.room,
      });
      toast.success('Period updated', `${cell.day} • P${cell.period}`);
      setCell(null);
    } catch (error) {
      toast.error('Could not save the period', error instanceof Error ? error.message : undefined);
    }
  };

  const deleteCell = async () => {
    if (!cell || !activeClass) return;
    try {
      await clearSlot.mutateAsync({ classId: activeClass.id, day: cell.day, period: cell.period });
      toast.success('Period cleared', `${cell.day} • P${cell.period} is now free.`);
      setCell(null);
    } catch (error) {
      toast.error('Could not clear the period', error instanceof Error ? error.message : undefined);
    }
  };

  const classTeachers = users.filter((item) => activeClass?.teacherIds.includes(item.id));
  const classSubjects = subjects.filter((item) => activeClass?.subjectIds.includes(item.id));
  return (
    <div>
      <PageHeader
        title="Weekly Timetable"
        description="Daily schedules across classes. Click on any period slot to change its subject or teacher."
        icon={<CalendarDays className="h-5 w-5" aria-hidden />}
        actions={
          <div className="flex items-center gap-2">
            <Select
              aria-label="Select class to view timetable"
              value={activeClassId}
              onChange={(e) => setParams({ classId: e.target.value })}
              className="w-48 text-sm"
              disabled={visibleClasses.length === 0}
              options={visibleClasses.map((c) => ({
                value: c.id,
                label: classLabel(c),
              }))}
            />
            {canManage && (
              <Badge tone="primary">Edit mode enabled</Badge>
            )}
          </div>
        }
      />

      {isError ? (
        <ErrorState
          title="Could not load timetable"
          description="Failed to load slots for this class. Please retry."
          onRetry={() => refetch()}
        />
      ) : isLoading || classesLoading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : !activeClass ? (
        <Card className="p-8 text-center text-slate-500">
          No class found or no class assigned to your account.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader
            title={classLabel(activeClass)}
            subtitle={`Room ${activeClass.room} • ${slots.length} scheduled periods across the week`}
            action={
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary-500" />
                  Scheduled
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  Free period
                </span>
              </div>
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b border-slate-200 bg-slate-50/80 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 w-28">
                    Period
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day}
                      className="border-b border-slate-200 bg-slate-50/80 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((period) => (
                  <tr key={period.number} className="hover:bg-slate-50/40 transition">
                    <td className="border-b border-slate-100 px-3 py-3 align-top bg-slate-50/30">
                      <p className="text-xs font-semibold text-slate-700">{period.label}</p>
                      <p className="text-[11px] text-slate-400">
                        {period.start}–{period.end}
                      </p>
                    </td>
                    {DAYS.map((day) => {
                      const slot = slotFor(day, period.number);
                      const color = slot ? subjectColor(subjects, slot.subjectId) : undefined;

                      return (
                        <td
                          key={`${day}-${period.number}`}
                          className="border-b border-slate-100 p-1.5 align-top"
                        >
                          {slot ? (
                            <motion.button
                              whileHover={canManage ? { scale: 1.02 } : undefined}
                              whileTap={canManage ? { scale: 0.98 } : undefined}
                              type="button"
                              onClick={() => openCell(day, period.number)}
                              disabled={!canManage}
                              className={cn(
                                'w-full text-left rounded-lg p-2.5 border transition relative group',
                                canManage ? 'cursor-pointer hover:shadow-sm' : 'cursor-default',
                                'bg-white border-slate-200 hover:border-slate-300',
                              )}
                              style={{ borderLeftWidth: '4px', borderLeftColor: color ?? '#6366f1' }}
                            >
                              <p className="font-semibold text-xs text-slate-900 truncate">
                                {subjectName(subjects, slot.subjectId)}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {userName(users, slot.teacherId)}
                              </p>
                              {canManage && (
                                <Pencil className="h-3 w-3 text-slate-400 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition" />
                              )}
                            </motion.button>
                          ) : canManage ? (
                            <button
                              type="button"
                              onClick={() => openCell(day, period.number)}
                              className="w-full min-h-[60px] rounded-lg border border-dashed border-slate-200 hover:border-primary-300 hover:bg-primary-50/30 transition flex flex-col items-center justify-center text-slate-400 hover:text-primary-600 gap-1 p-2"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-medium">Add</span>
                            </button>
                          ) : (
                            <div className="min-h-[60px] rounded-lg border border-dashed border-slate-100 flex items-center justify-center text-slate-300 text-xs">
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {/* Edit Slot Modal */}
      <Modal
        open={Boolean(cell)}
        onClose={() => setCell(null)}
        title={cell ? `Edit Slot • ${cell.day} Period ${cell.period}` : 'Edit Slot'}
        description={`Set the subject and assigned teacher for ${activeClass?.name} ${activeClass?.section}.`}
        size="sm"
        footer={
          <div className="flex w-full items-center justify-between">
            {cell && slotFor(cell.day, cell.period) ? (
              <Button
                variant="outline"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                leftIcon={<Eraser className="h-4 w-4" />}
                onClick={deleteCell}
                loading={clearSlot.isPending}
              >
                Clear
              </Button>
            ) : <span />}
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setCell(null)}>
                Cancel
              </Button>
              <Button onClick={saveCell} loading={upsertSlot.isPending}>
                Save Period
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <Select
              label="Subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required
              placeholder="Select subject…"
              options={classSubjects.map((sub) => ({
                value: sub.id,
                label: `${sub.name} (${sub.code})`,
              }))}
            />
            {classSubjects.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                This class does not have any subjects assigned yet.
              </p>
            )}
          </div>

          <div>
            <Select
              label="Teacher"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              required
              placeholder="Select teacher…"
              options={classTeachers.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
            />
            {classTeachers.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                No teachers assigned to this class yet.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
