import { resolveScope } from '../../lib/scope';
import { findSettings, gradeFor } from '../../lib/settings';
import type { AuthUser } from '../../middleware/auth';
import { Announcement } from '../../models/Announcement';
import { Attendance } from '../../models/Attendance';
import { ClassRoom } from '../../models/ClassRoom';
import { FeePayment } from '../../models/FeePayment';
import { Mark } from '../../models/Mark';
import { Quiz } from '../../models/Quiz';
import { Subject } from '../../models/Subject';
import { TimetableSlot } from '../../models/TimetableSlot';
import { User } from '../../models/User';

/** Period clock used by "today's timetable" on every dashboard. */
const PERIOD_TIMES: Record<number, string> = {
  1: '08:00–08:45',
  2: '08:45–09:30',
  3: '09:50–10:35',
  4: '10:35–11:20',
  5: '12:00–12:45',
  6: '12:45–13:30',
  7: '13:30–14:15',
  8: '14:15–15:00',
};

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface DashboardPayload {
  scopeLabel: string;
  attendance: {
    percent: number;
    present: number;
    absent: number;
    late: number;
    series: Array<{ label: string; present: number; absent: number; late: number }>;
  };
  marks: { percent: number; grade: string; bySubject: Array<{ label: string; value: number }> };
  fees: {
    collected: number;
    pending: number;
    paidCount: number;
    unpaidCount: number;
    split: Array<{ label: string; value: number }>;
  };
  todayPeriods: Array<{ period: string; time: string; subjectId: string; className: string }>;
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

function percentOf(obtained: number, total: number): number {
  return total ? Math.round((obtained / total) * 1000) / 10 : 0;
}

/**
 * One role-scoped aggregate for every dashboard.
 *  - admin / principal / super admin → whole institution
 *  - teachers → the classes they teach
 *  - students / parents → their own (or their children's) records
 */
export async function buildDashboard(user: AuthUser): Promise<DashboardPayload> {
  const scope = await resolveScope(user);
  const settings = await findSettings();

  const [students, classes, subjects, quizzes, announcements, parents, teachers] = await Promise.all([
    User.find(scope.studentIds ? { _id: { $in: scope.studentIds } } : { role: 'student' })
      .select('name rollNo classId')
      .lean(),
    ClassRoom.find(scope.classIds ? { _id: { $in: scope.classIds } } : {}).lean(),
    Subject.find().select('name classIds').lean(),
    Quiz.find(scope.classIds ? { classId: { $in: scope.classIds } } : {}).select('classId status').lean(),
    Announcement.find({ $or: [{ audience: 'all' }, { audience: user.role }] }).select('priority').lean(),
    User.countDocuments({ role: 'parent' }),
    User.countDocuments({ role: { $in: ['teacher', 'teacher_incharge'] } }),
  ]);

  const studentIds = students.map((student) => String(student._id));
  const classIds = classes.map((classRoom) => String(classRoom._id));

  const [attendance, marks, payments, slots] = await Promise.all([
    Attendance.find({ studentId: { $in: studentIds } }).lean(),
    Mark.find({ studentId: { $in: studentIds } }).lean(),
    FeePayment.find({ studentId: { $in: studentIds } }).lean(),
    TimetableSlot.find({ classId: { $in: classIds } }).lean(),
  ]);

  /* ---------------------------------------------------------------- attendance */
  const present = attendance.filter((record) => record.status === 'present').length;
  const late = attendance.filter((record) => record.status === 'late').length;
  const absent = attendance.filter((record) => record.status === 'absent').length;

  const byDate = new Map<string, { present: number; absent: number; late: number }>();
  for (const record of attendance) {
    const bucket = byDate.get(record.date) ?? { present: 0, absent: 0, late: 0 };
    bucket[record.status] += 1;
    byDate.set(record.date, bucket);
  }

  const series = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-10)
    .map(([date, counts]) => ({ label: date.slice(5), ...counts }));

  /* --------------------------------------------------------------------- marks */
  const marksPercent = percentOf(
    marks.reduce((sum, mark) => sum + mark.score, 0),
    marks.reduce((sum, mark) => sum + mark.total, 0),
  );

  const bySubject = subjects
    .map((subject) => {
      const own = marks.filter((mark) => mark.subjectId === String(subject._id));
      const obtained = own.reduce((sum, mark) => sum + mark.score, 0);
      const total = own.reduce((sum, mark) => sum + mark.total, 0);
      return { label: subject.name, value: percentOf(obtained, total), graded: total > 0 };
    })
    .filter((row) => row.graded)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
    .map(({ label, value }) => ({ label, value }));

  /* ---------------------------------------------------------------------- fees */
  const collected = payments.reduce((sum, payment) => sum + payment.paidAmount, 0);
  const billed = payments.reduce((sum, payment) => sum + payment.amount, 0);

  /* ----------------------------------------------------------- today's periods */
  const todayName = new Date().toLocaleDateString('en-GB', { weekday: 'short' });
  const day = WEEK_DAYS.includes(todayName) ? todayName : 'Mon';

  const todayPeriods = slots
    .filter((slot) => slot.day === day)
    .sort((a, b) => a.period - b.period)
    .slice(0, 6)
    .map((slot) => ({
      period: `P${slot.period}`,
      time: PERIOD_TIMES[slot.period] ?? '',
      subjectId: slot.subjectId,
      className: classes.find((classRoom) => String(classRoom._id) === slot.classId)?.name ?? '',
    }));

  /* ------------------------------------------------------------------ ranking */
  const topStudents = students
    .map((student) => {
      const own = marks.filter((mark) => mark.studentId === String(student._id));
      return {
        id: String(student._id),
        name: student.name,
        percent: percentOf(
          own.reduce((sum, mark) => sum + mark.score, 0),
          own.reduce((sum, mark) => sum + mark.total, 0),
        ),
      };
    })
    .filter((row) => row.percent > 0)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 5);

  return {
    scopeLabel: scope.studentIds
      ? `${students.length} student${students.length === 1 ? '' : 's'}`
      : 'Whole institution',
    attendance: {
      percent: attendance.length ? Math.round(((present + late) / attendance.length) * 100) : 0,
      present,
      absent,
      late,
      series,
    },
    marks: {
      percent: marksPercent,
      grade: marksPercent ? gradeFor(marksPercent, settings.gradeBands).grade : '—',
      bySubject,
    },
    fees: {
      collected,
      pending: Math.max(0, billed - collected),
      paidCount: payments.filter((payment) => payment.status === 'paid').length,
      unpaidCount: payments.filter((payment) => payment.status !== 'paid').length,
      split: [
        { label: 'Paid', value: payments.filter((payment) => payment.status === 'paid').length },
        { label: 'Partial', value: payments.filter((payment) => payment.status === 'partial').length },
        { label: 'Unpaid', value: payments.filter((payment) => payment.status === 'unpaid').length },
      ],
    },
    todayPeriods,
    subjectCount: subjects.length,
    quizCount: quizzes.length,
    studentCount: students.length,
    teacherCount: teachers,
    parentCount: parents,
    classCount: classes.length,
    announcementCount: announcements.length,
    pendingApprovals: announcements.filter((item) => item.priority === 'high').length,
    topStudents,
  };
}
