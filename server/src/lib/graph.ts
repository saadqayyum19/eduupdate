import { ClassRoom } from '../models/ClassRoom';
import { FeePayment } from '../models/FeePayment';
import { Mark } from '../models/Mark';
import { Attendance } from '../models/Attendance';
import { Quiz } from '../models/Quiz';
import { QuizSubmission } from '../models/QuizSubmission';
import { Subject } from '../models/Subject';
import { TimetableSlot } from '../models/TimetableSlot';
import { User } from '../models/User';

/**
 * Referential integrity.
 *
 * MongoDB has no foreign keys, so every delete goes through these helpers. They are the
 * single place that knows which collections point at a class, subject or user, which
 * keeps orphans out of the database.
 */

/** Brings students, teachers, subjects and incharges in line with one class document. */
export async function reconcileClass(classId: string): Promise<void> {
  const classRoom = await ClassRoom.findById(classId);
  if (!classRoom) return;

  const studentIds = new Set(classRoom.studentIds);
  const teacherIds = new Set(classRoom.teacherIds);
  const subjectIds = new Set(classRoom.subjectIds);

  // A student belongs to exactly one class.
  await User.updateMany({ role: 'student', _id: { $in: [...studentIds] } }, { $set: { classId } });
  await User.updateMany(
    { role: 'student', classId, _id: { $nin: [...studentIds] } },
    { $unset: { classId: '' } },
  );

  // Teachers: add this class to the ones they teach, or remove it again.
  await User.updateMany(
    { role: { $in: ['teacher', 'teacher_incharge'] }, _id: { $in: [...teacherIds] } },
    { $addToSet: { classIds: classId } },
  );
  await User.updateMany(
    { role: { $in: ['teacher', 'teacher_incharge'] }, classIds: classId, _id: { $nin: [...teacherIds] } },
    { $pull: { classIds: classId } },
  );

  // Subjects mirror the class assignment.
  await Subject.updateMany({ _id: { $in: [...subjectIds] } }, { $addToSet: { classIds: classId } });
  await Subject.updateMany({ classIds: classId, _id: { $nin: [...subjectIds] } }, { $pull: { classIds: classId } });

  // Clear incharge references that no longer resolve.
  if (classRoom.inchargeId && !teacherIds.has(classRoom.inchargeId)) {
    classRoom.inchargeId = null;
  }
  const cleaned: Record<string, string> = {};
  for (const [subjectId, teacherId] of classRoom.subjectIncharges.entries()) {
    if (subjectIds.has(subjectId) && teacherId && teacherIds.has(teacherId)) cleaned[subjectId] = teacherId;
  }
  classRoom.subjectIncharges = new Map(Object.entries(cleaned)) as typeof classRoom.subjectIncharges;
  await classRoom.save();
}

/** Removes every trace of a class. */
export async function purgeClassReferences(classId: string): Promise<void> {
  await User.updateMany({ role: 'student', classId }, { $unset: { classId: '' } });
  await User.updateMany(
    { role: { $in: ['teacher', 'teacher_incharge'] }, classIds: classId },
    { $pull: { classIds: classId } },
  );
  await Subject.updateMany({ classIds: classId }, { $pull: { classIds: classId } });
  await TimetableSlot.deleteMany({ classId });
  await Attendance.deleteMany({ classId });
  await Mark.deleteMany({ classId });

  const quizIds = (await Quiz.find({ classId }).select('_id').lean()).map((quiz) => String(quiz._id));
  if (quizIds.length) {
    await Quiz.deleteMany({ _id: { $in: quizIds } });
    await QuizSubmission.deleteMany({ quizId: { $in: quizIds } });
  }
  await FeePayment.deleteMany({ classId });
}

/** Removes every trace of a user: personal records go, authorship is handed over. */
export async function purgeUserReferences(userId: string, substituteId: string | null): Promise<void> {
  await ClassRoom.updateMany({ teacherIds: userId }, { $pull: { teacherIds: userId } });
  await ClassRoom.updateMany({ studentIds: userId }, { $pull: { studentIds: userId } });
  await ClassRoom.updateMany({ inchargeId: userId }, { $set: { inchargeId: null } });

  await User.updateMany({ childIds: userId }, { $pull: { childIds: userId } });
  await User.updateMany({ parentIds: userId }, { $pull: { parentIds: userId } });

  await Attendance.updateMany({ markedBy: userId }, { $set: { markedBy: substituteId } });
  await Mark.updateMany({ enteredBy: userId }, { $set: { enteredBy: substituteId } });
  await Quiz.updateMany({ teacherId: userId }, { $set: { teacherId: substituteId } });
  await QuizSubmission.updateMany({ markedBy: userId }, { $set: { markedBy: substituteId } });

  await Attendance.deleteMany({ studentId: userId });
  await Mark.deleteMany({ studentId: userId });
  await QuizSubmission.deleteMany({ studentId: userId });
  await FeePayment.deleteMany({ studentId: userId });
}

/** Removes every trace of a subject. */
export async function purgeSubjectReferences(subjectId: string): Promise<void> {
  await ClassRoom.updateMany({ subjectIds: subjectId }, { $pull: { subjectIds: subjectId } });
  await ClassRoom.updateMany({}, { $unset: { [`subjectIncharges.${subjectId}`]: '' } });
  await TimetableSlot.deleteMany({ subjectId });
  await Mark.deleteMany({ subjectId });

  const quizIds = (await Quiz.find({ subjectId }).select('_id').lean()).map((quiz) => String(quiz._id));
  if (quizIds.length) {
    await Quiz.deleteMany({ _id: { $in: quizIds } });
    await QuizSubmission.deleteMany({ quizId: { $in: quizIds } });
  }
}

/** A staff account that inherits authorship when an author is deleted. */
export async function fallbackStaffId(): Promise<string | null> {
  const staff = await User.findOne({ role: { $in: ['super_admin', 'admin', 'principal'] }, status: 'active' })
    .select('_id')
    .lean();
  return staff ? String(staff._id) : null;
}

/** Sequential invoice numbers that never repeat: INV-1001, INV-1002, … */
export async function nextInvoiceNumber(): Promise<string> {
  const last = await FeePayment.findOne().sort({ createdAt: -1 }).select('invoiceNo').lean();
  const match = /^INV-(\d+)$/.exec(last?.invoiceNo ?? '');
  return `INV-${match ? Number(match[1]) + 1 : 1001}`;
}
