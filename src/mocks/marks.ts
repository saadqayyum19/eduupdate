import type { ExamType, Mark } from '@/types';
import { dateOffset } from '@/lib/utils';
import { classes } from './classes';
import { keyInt } from './seed';

/**
 * Marks for every student × subject × exam type (quiz 20, midterm 100, final 100).
 * A stable per-student "ability" keeps each child's profile believable and means
 * result cards, class averages and report charts all agree with each other.
 */

const EXAMS: Array<{ examType: ExamType; title: string; total: number; date: string }> = [
  { examType: 'quiz', title: 'Class Test 1', total: 20, date: dateOffset(-18) },
  { examType: 'midterm', title: 'Mid Term Exam', total: 100, date: dateOffset(-40) },
  { examType: 'final', title: 'Final Exam', total: 100, date: dateOffset(-75) },
];

function abilityOf(studentId: string): number {
  // 58% – 96% baseline per student.
  return keyInt(`ability|${studentId}`, 58, 96);
}

function buildMarks(): Mark[] {
  const marks: Mark[] = [];

  classes.forEach((classRoom) => {
    classRoom.studentIds.forEach((studentId) => {
      classRoom.subjectIds.forEach((subjectId) => {
        EXAMS.forEach((exam) => {
          const swing = keyInt(`swing|${studentId}|${subjectId}|${exam.examType}`, -9, 9);
          const percent = Math.min(99, Math.max(35, abilityOf(studentId) + swing));
          const score = Math.round((exam.total * percent) / 100);

          marks.push({
            id: `mk-${studentId}-${subjectId}-${exam.examType}`,
            studentId,
            classId: classRoom.id,
            subjectId,
            examType: exam.examType,
            title: exam.title,
            score,
            total: exam.total,
            date: exam.date,
            enteredBy: classRoom.subjectIncharges[subjectId] ?? classRoom.inchargeId ?? 'u-admin',
          });
        });
      });
    });
  });

  return marks;
}

export const marks: Mark[] = buildMarks();
export { abilityOf };
