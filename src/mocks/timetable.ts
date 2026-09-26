import type { TimetableSlot } from '@/types';
import { DAYS, PERIODS } from '@/lib/constants';
import { classes } from './classes';
import { subjects } from './subjects';

/**
 * A full Mon–Sat × P1–P6 timetable for every class (108 slots).
 * Subjects rotate so each class sees every subject through the week, and the
 * teacher is taken from the class' per-subject incharge.
 */
function buildTimetable(): TimetableSlot[] {
  const slots: TimetableSlot[] = [];

  classes.forEach((classRoom) => {
    const classSubjects = subjects.filter((subject) => classRoom.subjectIds.includes(subject.id));

    DAYS.forEach((day, dayIndex) => {
      PERIODS.forEach((period, periodIndex) => {
        const subject = classSubjects[(dayIndex * 2 + periodIndex) % classSubjects.length];
        const teacherId =
          classRoom.subjectIncharges[subject.id] ?? classRoom.teacherIds[0] ?? classRoom.inchargeId ?? '';

        slots.push({
          id: `tt-${classRoom.id}-${day}-P${period.number}`,
          classId: classRoom.id,
          day,
          period: period.number,
          subjectId: subject.id,
          teacherId,
          room: classRoom.room,
        });
      });
    });
  });

  return slots;
}

export const timetable: TimetableSlot[] = buildTimetable();
