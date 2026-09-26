import type { AttendanceRecord, AttendanceStatus } from '@/types';
import { classes } from './classes';
import { keyRandom, recentSchoolDays } from './seed';

/**
 * One week of attendance for every student (6 school days × 10 students = 60 rows).
 * The dates are the most recent Mon–Sat days (including today), so the daily roster
 * and the monthly calendar both have real data on first load.
 */
export const ATTENDANCE_WEEK = recentSchoolDays(6);

function statusFor(studentId: string, date: string): AttendanceStatus {
  const roll = keyRandom(`${studentId}|${date}`);
  if (roll > 0.92) return 'absent';
  if (roll > 0.84) return 'late';
  return 'present';
}

function buildAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];

  classes.forEach((classRoom) => {
    ATTENDANCE_WEEK.forEach((date) => {
      classRoom.studentIds.forEach((studentId) => {
        records.push({
          id: `att-${classRoom.id}-${studentId}-${date}`,
          classId: classRoom.id,
          studentId,
          date,
          status: statusFor(studentId, date),
          markedBy: classRoom.inchargeId ?? classRoom.teacherIds[0] ?? 'u-admin',
        });
      });
    });
  });

  return records;
}

export const attendance: AttendanceRecord[] = buildAttendance();
