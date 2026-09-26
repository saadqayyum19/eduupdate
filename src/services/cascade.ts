import type { MockDatabase } from '@/mocks';
import { getDb } from './mockDb';

/**
 * Referential-integrity helpers for the mock database.
 *
 * The mock store has no foreign keys, so every write path used to hand-roll its own
 * (incomplete) cleanup — which is how orphans accumulated. These helpers are the single
 * place that knows which collections point at a class, user or subject, so create,
 * update and delete all keep the graph consistent.
 */

/** A staff account that can stand in for a deleted author/owner. */
function fallbackUserId(db: MockDatabase): string {
  const order = ['super_admin', 'admin', 'principal', 'teacher_incharge', 'teacher'] as const;
  for (const role of order) {
    const found = db.users.find((user) => user.role === role && user.status === 'active');
    if (found) return found.id;
  }
  return '';
}

function replaceAuthorship(db: MockDatabase, userId: string) {
  const substitute = fallbackUserId(db);
  db.attendance.forEach((record) => {
    if (record.markedBy === userId) record.markedBy = substitute;
  });
  db.marks.forEach((mark) => {
    if (mark.enteredBy === userId) mark.enteredBy = substitute;
  });
  db.quizzes.forEach((quiz) => {
    if (quiz.teacherId === userId) quiz.teacherId = substitute;
  });
}

/**
 * Bring the whole graph in line with one class document.
 *
 * - students listed in `studentIds` get `classId` set and are removed from any other class
 * - teachers listed in `teacherIds` get the class added to `classIds` (removed when unassigned)
 * - subjects listed in `subjectIds` get the class added to `classIds`
 * - `inchargeId` / `subjectIncharges` entries that no longer resolve are cleared
 */
export function reconcileClass(classId: string): void {
  const db = getDb();
  const classRoom = db.classes.find((item) => item.id === classId);
  if (!classRoom) return;

  const studentIds = new Set(classRoom.studentIds);
  const teacherIds = new Set(classRoom.teacherIds);
  const subjectIds = new Set(classRoom.subjectIds);

  // A student belongs to exactly one class.
  db.users.forEach((user) => {
    if (user.role !== 'student') return;
    if (studentIds.has(user.id)) {
      user.classId = classId;
      db.classes.forEach((other) => {
        if (other.id !== classId && other.studentIds.includes(user.id)) {
          other.studentIds = other.studentIds.filter((id) => id !== user.id);
        }
      });
    } else if (user.classId === classId) {
      user.classId = undefined;
    }
  });

  db.users.forEach((user) => {
    if (user.role !== 'teacher' && user.role !== 'teacher_incharge') return;
    const classes = new Set(user.classIds ?? []);
    if (teacherIds.has(user.id)) classes.add(classId);
    else classes.delete(classId);
    user.classIds = [...classes];
  });

  db.subjects.forEach((subject) => {
    const classes = new Set(subject.classIds);
    if (subjectIds.has(subject.id)) classes.add(classId);
    else classes.delete(classId);
    subject.classIds = [...classes];
  });

  if (classRoom.inchargeId && !teacherIds.has(classRoom.inchargeId)) classRoom.inchargeId = null;

  const cleanedIncharges: Record<string, string | null> = {};
  Object.entries(classRoom.subjectIncharges).forEach(([subjectId, teacherId]) => {
    if (subjectIds.has(subjectId) && teacherId && teacherIds.has(teacherId)) {
      cleanedIncharges[subjectId] = teacherId;
    }
  });
  classRoom.subjectIncharges = cleanedIncharges;
}

/** Remove every trace of a class from the rest of the database. */
export function purgeClassReferences(classId: string): void {
  const db = getDb();

  db.users.forEach((user) => {
    if (user.classId === classId) user.classId = undefined;
    if (user.classIds?.includes(classId)) user.classIds = user.classIds.filter((id) => id !== classId);
  });

  db.subjects.forEach((subject) => {
    if (subject.classIds.includes(classId)) {
      subject.classIds = subject.classIds.filter((id) => id !== classId);
    }
  });

  db.timetable = db.timetable.filter((slot) => slot.classId !== classId);
  db.attendance = db.attendance.filter((record) => record.classId !== classId);
  db.marks = db.marks.filter((mark) => mark.classId !== classId);

  const quizIds = new Set(db.quizzes.filter((quiz) => quiz.classId === classId).map((quiz) => quiz.id));
  if (quizIds.size) {
    db.quizzes = db.quizzes.filter((quiz) => !quizIds.has(quiz.id));
    db.quizSubmissions = db.quizSubmissions.filter((submission) => !quizIds.has(submission.quizId));
  }

  const structureIds = new Set(
    db.feeStructures.filter((structure) => structure.classId === classId).map((structure) => structure.id),
  );
  if (structureIds.size) {
    db.feeStructures = db.feeStructures.filter((structure) => !structureIds.has(structure.id));
    db.feePayments = db.feePayments.filter((payment) => !structureIds.has(payment.structureId));
  }
}

export const cascadeDeleteClass = purgeClassReferences;
export const cascadeDeleteUser = purgeUserReferences;
export const cascadeDeleteSubject = purgeSubjectReferences;

/**
 * Remove every trace of a user from the rest of the database.
 * Personal records (attendance, marks, submissions, invoices) are deleted;
 * authorship/ownership references are handed to a staff fallback.
 */
export function purgeUserReferences(userId: string): void {
  const db = getDb();

  db.classes.forEach((classRoom) => {
    classRoom.teacherIds = classRoom.teacherIds.filter((id) => id !== userId);
    classRoom.studentIds = classRoom.studentIds.filter((id) => id !== userId);
    if (classRoom.inchargeId === userId) classRoom.inchargeId = null;

    const cleaned: Record<string, string | null> = {};
    Object.entries(classRoom.subjectIncharges).forEach(([subjectId, teacherId]) => {
      if (teacherId && teacherId !== userId) cleaned[subjectId] = teacherId;
    });
    classRoom.subjectIncharges = cleaned;
  });

  // Break parent ↔ child links in both directions.
  db.users.forEach((user) => {
    if (user.id === userId) return;
    if (user.childIds?.includes(userId)) user.childIds = user.childIds.filter((id) => id !== userId);
    if (user.parentIds?.includes(userId)) user.parentIds = user.parentIds.filter((id) => id !== userId);
  });

  replaceAuthorship(db, userId);

  db.attendance = db.attendance.filter((record) => record.studentId !== userId);
  db.marks = db.marks.filter((mark) => mark.studentId !== userId);
  db.quizSubmissions = db.quizSubmissions.filter((submission) => submission.studentId !== userId);
  db.feePayments = db.feePayments.filter((payment) => payment.studentId !== userId);
}

/** Remove every trace of a subject (timetable slots, marks, quizzes, class assignments). */
export function purgeSubjectReferences(subjectId: string): void {
  const db = getDb();

  db.classes.forEach((classRoom) => {
    if (classRoom.subjectIds.includes(subjectId)) {
      classRoom.subjectIds = classRoom.subjectIds.filter((id) => id !== subjectId);
    }
    if (subjectId in classRoom.subjectIncharges) {
      const rest = { ...classRoom.subjectIncharges };
      delete rest[subjectId];
      classRoom.subjectIncharges = rest;
    }
  });

  db.timetable = db.timetable.filter((slot) => slot.subjectId !== subjectId);
  db.marks = db.marks.filter((mark) => mark.subjectId !== subjectId);

  const quizIds = new Set(db.quizzes.filter((quiz) => quiz.subjectId === subjectId).map((quiz) => quiz.id));
  if (quizIds.size) {
    db.quizzes = db.quizzes.filter((quiz) => !quizIds.has(quiz.id));
    db.quizSubmissions = db.quizSubmissions.filter((submission) => !quizIds.has(submission.quizId));
  }
}

/** Next free `INV-nnnn` number — derived from existing data so numbers never repeat. */
export function nextInvoiceNumber(): string {
  const highest = getDb()
    .feePayments.map((payment) => /^INV-(\d+)$/.exec(payment.invoiceNo)?.[1])
    .filter((value): value is string => Boolean(value))
    .reduce((max, value) => Math.max(max, Number(value)), 1000);
  return `INV-${highest + 1}`;
}

/** True when the email is already used by another account. */
export function emailInUse(email: string, exceptUserId?: string): boolean {
  const normalised = email.trim().toLowerCase();
  return getDb().users.some(
    (user) => user.id !== exceptUserId && user.email.trim().toLowerCase() === normalised,
  );
}

