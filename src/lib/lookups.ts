import type { AttendanceRecord, ClassRoom, Mark, Subject, User } from '@/types';
import { gradeFor, percentage } from './utils';

/** "Class 10 — A" */
export function classLabel(classRoom: ClassRoom | undefined | null): string {
  if (!classRoom) return '—';
  return `${classRoom.name} — ${classRoom.section}`;
}

export function userName(users: User[], id: string | null | undefined): string {
  if (!id) return '—';
  return users.find((user) => user.id === id)?.name ?? '—';
}

export function subjectName(subjects: Subject[], id: string): string {
  return subjects.find((subject) => subject.id === id)?.name ?? '—';
}

export function subjectColor(subjects: Subject[], id: string): string {
  return subjects.find((subject) => subject.id === id)?.color ?? '#64748b';
}

export function studentsOfClass(users: User[], classId: string | undefined): User[] {
  if (!classId) return [];
  return users.filter((user) => user.role === 'student' && user.classId === classId);
}

export function teachersOfClass(users: User[], classIds: string[]): User[] {
  return users.filter(
    (user) =>
      (user.role === 'teacher' || user.role === 'teacher_incharge') &&
      (user.classIds ?? []).some((id) => classIds.includes(id)),
  );
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  total: number;
  percent: number;
}

/** Counts + percentage for any list of attendance rows. */
export function attendanceSummary(records: AttendanceRecord[]): AttendanceSummary {
  const present = records.filter((record) => record.status === 'present').length;
  const absent = records.filter((record) => record.status === 'absent').length;
  const late = records.filter((record) => record.status === 'late').length;
  const total = records.length;
  return {
    present,
    absent,
    late,
    total,
    percent: total ? Math.round(((present + late) / total) * 100) : 0,
  };
}

export interface ResultInputs {
  student: User;
  classRoom: ClassRoom | null;
  subjects: Subject[];
  /** Every mark of the student's class — needed for the class position. */
  classMarks: Mark[];
  classSize: number;
}

/**
 * Turn raw marks into a printable result card: per-subject totals, overall
 * percentage, grade and class position.
 */
export function buildResultCard(inputs: ResultInputs) {
  const { student, classRoom, subjects, classMarks, classSize } = inputs;
  const ownMarks = classMarks.filter((mark) => mark.studentId === student.id);

  const rows = (classRoom?.subjectIds ?? [])
    .map((subjectId) => {
      const subjectMarks = ownMarks.filter((mark) => mark.subjectId === subjectId);
      const obtained = subjectMarks.reduce((sum, mark) => sum + mark.score, 0);
      const total = subjectMarks.reduce((sum, mark) => sum + mark.total, 0);
      const percent = percentage(obtained, total);
      return {
        subjectId,
        subjectName: subjectName(subjects, subjectId),
        obtained,
        total,
        percentage: percent,
        grade: gradeFor(percent),
      };
    })
    .filter((row) => row.total > 0);

  const totalObtained = rows.reduce((sum, row) => sum + row.obtained, 0);
  const totalMax = rows.reduce((sum, row) => sum + row.total, 0);
  const percent = percentage(totalObtained, totalMax);

  const ranking = [...new Set(classMarks.map((mark) => mark.studentId))]
    .map((studentId) => {
      const marksOfStudent = classMarks.filter((mark) => mark.studentId === studentId);
      const obtained = marksOfStudent.reduce((sum, mark) => sum + mark.score, 0);
      const total = marksOfStudent.reduce((sum, mark) => sum + mark.total, 0);
      return { studentId, percent: percentage(obtained, total) };
    })
    .sort((a, b) => b.percent - a.percent);

  const position = Math.max(1, ranking.findIndex((row) => row.studentId === student.id) + 1);

  return {
    rows,
    totalObtained,
    totalMax,
    percentage: percent,
    grade: gradeFor(percent),
    position,
    classSize,
  };
}
