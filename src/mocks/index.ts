import type {
  Announcement,
  AttendanceRecord,
  ClassRoom,
  FeePayment,
  FeeStructure,
  Mark,
  Quiz,
  QuizSubmission,
  Subject,
  TimetableSlot,
  User,
} from '@/types';
import { announcements } from './announcements';
import { attendance, ATTENDANCE_WEEK } from './attendance';
import { classes } from './classes';
import { feePayments, feeStructures } from './fees';
import { marks } from './marks';
import { quizSubmissions, quizzes, TODAY } from './quizzes';
import { subjects } from './subjects';
import { timetable } from './timetable';
import { DEFAULT_USER_ID, DEMO_PASSWORD, users } from './users';

export interface MockDatabase {
  users: User[];
  classes: ClassRoom[];
  subjects: Subject[];
  timetable: TimetableSlot[];
  attendance: AttendanceRecord[];
  quizzes: Quiz[];
  quizSubmissions: QuizSubmission[];
  marks: Mark[];
  feeStructures: FeeStructure[];
  feePayments: FeePayment[];
  announcements: Announcement[];
}

/**
 * The whole demo school in one object. `createDatabase()` returns a deep copy so a
 * running app can mutate its data without touching the seed (refresh = clean slate).
 */
export function createDatabase(): MockDatabase {
  return structuredClone({
    users,
    classes,
    subjects,
    timetable,
    attendance,
    quizzes,
    quizSubmissions,
    marks,
    feeStructures,
    feePayments,
    announcements,
  });
}

export {
  announcements,
  attendance,
  ATTENDANCE_WEEK,
  classes,
  DEFAULT_USER_ID,
  DEMO_PASSWORD,
  feePayments,
  feeStructures,
  marks,
  quizSubmissions,
  quizzes,
  subjects,
  timetable,
  TODAY,
  users,
};
