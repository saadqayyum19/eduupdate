import { useQuery } from '@tanstack/react-query';
import type { Mark, Role, User } from '@/types';
import { DAYS, PERIODS } from '@/lib/constants';
import { percentage, today } from '@/lib/utils';
import { getDb, mockDelay } from '../mockDb';

/**
 * One aggregated payload that every role dashboard renders.
 * Scoping rules:
 *  - admin / principal / super admin -> whole school
 *  - teacher / teacher incharge      -> the classes they teach
 *  - student                         -> their own class
 *  - parent                          -> their child's class
 *
 * The real backend will expose `GET /api/dashboard` returning this same shape.
 */
export interface SeriesPoint {
  label: string;
  present: number;
  absent: number;
  late: number;
}

export interface PeriodRow {
  period: string;
  time: string;
  subjectId: string;
  className: string;
}

export interface DashboardData {
  scopeLabel: string;
  attendance: { percent: number; series: SeriesPoint[]; present: number; absent: number; late: number };
  marks: { percent: number; bySubject: Array<{ label: string; value: number }> };
  fees: {
    collected: number;
    pending: number;
    split: Array<{ label: string; value: number }>;
    paidCount: number;
    unpaidCount: number;
  };
  todayPeriods: PeriodRow[];
  subjectCount: number;
  quizCount: number;
  studentCount: number;
  teacherCount: number;
  parentCount: number;
  classCount: number;
  announcementCount: number;
  pendingApprovals: number;
  topStudents: Array<{ id: string; name: string; percent: number }>;
}

function scopedStudentIds(role: Role | undefined, user: User | undefined): string[] | null {
  if (!user) return null;
  const db = getDb();

  if (role === 'student') return [user.id];
  if (role === 'parent') return user.childIds ?? [];
  if (role === 'teacher' || role === 'teacher_incharge') {
    const teacherClassIds = user.classIds ?? [];
    return db.users
      .filter((item) => item.role === 'student' && item.classId && teacherClassIds.includes(item.classId))
      .map((item) => item.id);
  }
  return null; // school-wide
}

function averagePercentage(marks: Mark[]): number {
  const obtained = marks.reduce((sum, mark) => sum + mark.score, 0);
  const total = marks.reduce((sum, mark) => sum + mark.total, 0);
  return percentage(obtained, total);
}

export async function fetchDashboard(input: { role: Role; userId: string }): Promise<DashboardData> {
  await mockDelay();
  const db = getDb();
  const user = db.users.find((item) => item.id === input.userId);
  const studentIds = scopedStudentIds(input.role, user);

  const inScope = (id: string) => (studentIds ? studentIds.includes(id) : true);
  const classIds = studentIds
    ? [...new Set(db.users.filter((item) => studentIds.includes(item.id)).map((item) => item.classId ?? ''))].filter(
        Boolean,
      )
    : db.classes.map((item) => item.id);

  // ------------------------------------------------------------------ attendance
  const attendanceRecords = db.attendance.filter((record) => inScope(record.studentId));
  const present = attendanceRecords.filter((record) => record.status === 'present').length;
  const late = attendanceRecords.filter((record) => record.status === 'late').length;
  const absent = attendanceRecords.filter((record) => record.status === 'absent').length;

  const series: SeriesPoint[] = [...new Set(attendanceRecords.map((record) => record.date))]
    .sort()
    .map((date) => {
      const dayRecords = attendanceRecords.filter((record) => record.date === date);
      return {
        label: new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
        present: dayRecords.filter((record) => record.status === 'present').length,
        absent: dayRecords.filter((record) => record.status === 'absent').length,
        late: dayRecords.filter((record) => record.status === 'late').length,
      };
    });

  // ----------------------------------------------------------------------- marks
  const marksInScope = db.marks.filter((mark) => inScope(mark.studentId));
  const bySubject = db.subjects
    .map((subject) => ({
      label: subject.name,
      value: averagePercentage(marksInScope.filter((mark) => mark.subjectId === subject.id)),
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);

  // ------------------------------------------------------------------------ fees
  const feesInScope = db.feePayments.filter((payment) => inScope(payment.studentId));
  const collected = feesInScope.reduce((sum, payment) => sum + payment.paidAmount, 0);
  const billed = feesInScope.reduce((sum, payment) => sum + payment.amount, 0);

  // -------------------------------------------------------------- today's periods
  const todayName = new Date().toLocaleDateString('en-GB', { weekday: 'short' });
  const day = (DAYS as readonly string[]).includes(todayName) ? todayName : DAYS[0];
  const todayPeriods: PeriodRow[] = db.timetable
    .filter((slot) => slot.day === day && classIds.includes(slot.classId))
    .sort((a, b) => a.period - b.period)
    .slice(0, 6)
    .map((slot) => {
      const meta = PERIODS.find((item) => item.number === slot.period);
      return {
        period: `P${slot.period}`,
        time: `${meta?.start ?? ''}–${meta?.end ?? ''}`,
        subjectId: slot.subjectId,
        className: db.classes.find((item) => item.id === slot.classId)?.name ?? '',
      };
    });

  // --------------------------------------------------------------------- ranking
  const rankedIds = studentIds ?? db.users.filter((item) => item.role === 'student').map((item) => item.id);
  const topStudents = rankedIds
    .map((studentId) => ({
      id: studentId,
      name: db.users.find((item) => item.id === studentId)?.name ?? 'Student',
      percent: averagePercentage(db.marks.filter((mark) => mark.studentId === studentId)),
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 5);

  return {
    scopeLabel: studentIds ? `${studentIds.length} student${studentIds.length === 1 ? '' : 's'}` : 'Whole school',
    attendance: {
      percent: attendanceRecords.length ? Math.round(((present + late) / attendanceRecords.length) * 100) : 0,
      present,
      absent,
      late,
      series,
    },
    marks: { percent: averagePercentage(marksInScope), bySubject },
    fees: {
      collected,
      pending: Math.max(0, billed - collected),
      split: [
        { label: 'Paid', value: feesInScope.filter((payment) => payment.status === 'paid').length },
        { label: 'Partial', value: feesInScope.filter((payment) => payment.status === 'partial').length },
        { label: 'Unpaid', value: feesInScope.filter((payment) => payment.status === 'unpaid').length },
      ],
      paidCount: feesInScope.filter((payment) => payment.status === 'paid').length,
      unpaidCount: feesInScope.filter((payment) => payment.status !== 'paid').length,
    },
    todayPeriods,
    subjectCount: studentIds
      ? db.subjects.filter((subject) => subject.classIds.some((id) => classIds.includes(id))).length
      : db.subjects.length,
    quizCount: db.quizzes.filter((quiz) => classIds.includes(quiz.classId)).length,
    studentCount: studentIds ? studentIds.length : db.users.filter((item) => item.role === 'student').length,
    teacherCount: studentIds
      ? db.classes
          .filter((classRoom) => classIds.includes(classRoom.id))
          .reduce((sum, classRoom) => sum + classRoom.teacherIds.length, 0)
      : db.users.filter((item) => item.role === 'teacher' || item.role === 'teacher_incharge').length,
    parentCount: db.users.filter((item) => item.role === 'parent').length,
    classCount: studentIds ? classIds.length : db.classes.length,
    announcementCount: db.announcements.length,
    pendingApprovals: db.announcements.filter((item) => item.priority === 'high').length,
    topStudents,
  };
}

export function useDashboard(role: Role, userId: string) {
  return useQuery({
    queryKey: ['dashboard', role, userId, today()],
    queryFn: () => fetchDashboard({ role, userId }),
  });
}

