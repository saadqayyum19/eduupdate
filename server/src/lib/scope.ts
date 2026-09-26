import { ApiError } from './ApiError';
import { ClassRoom } from '../models/ClassRoom';
import { User } from '../models/User';
import type { AuthUser } from '../middleware/auth';
import { STAFF_ROLES } from './permissions';

/**
 * Row-level data scoping.
 *
 * - `null` means "no restriction" (whole institution).
 * - Staff of the school see everything; teachers see the classes they teach;
 *   students and parents only ever see their own / their children's records.
 */
export interface Scope {
  studentIds: string[] | null;
  classIds: string[] | null;
}

export async function resolveScope(user: AuthUser): Promise<Scope> {
  if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'principal') {
    return { studentIds: null, classIds: null };
  }

  if (user.role === 'student') {
    const account = await User.findById(user.id).lean();
    return {
      studentIds: [user.id],
      classIds: account?.classId ? [account.classId] : [],
    };
  }

  if (user.role === 'parent') {
    const account = await User.findById(user.id).lean();
    const childIds = account?.childIds ?? [];
    if (!childIds.length) return { studentIds: [], classIds: [] };
    const children = await User.find({ _id: { $in: childIds } }).select('classId').lean();
    const classIds = [...new Set(children.map((child) => child.classId).filter((id): id is string => Boolean(id)))];
    return { studentIds: childIds, classIds };
  }

  if (user.role === 'teacher' || user.role === 'teacher_incharge') {
    const account = await User.findById(user.id).lean();
    const owned = new Set(account?.classIds ?? []);
    const classes = await ClassRoom.find({ teacherIds: user.id }).select('_id studentIds').lean();
    classes.forEach((classRoom) => owned.add(String(classRoom._id)));

    const classIds = [...owned];
    if (!classIds.length) return { studentIds: [], classIds: [] };

    const students = await User.find({ role: 'student', classId: { $in: classIds } })
      .select('_id')
      .lean();

    return { studentIds: students.map((student) => String(student._id)), classIds };
  }

  return { studentIds: null, classIds: null };
}

/** Narrows an explicit filter with the caller's scope. */
export function scopedFilter(
  scope: Scope,
  field: 'studentId' | 'classId',
  requested?: string,
): Record<string, unknown> {
  const allowed = field === 'studentId' ? scope.studentIds : scope.classIds;

  if (requested) {
    if (allowed && !allowed.includes(requested)) {
      // Ask for a single record, but only ever the ones this user may see.
      return { [field]: { $in: [] } };
    }
    return { [field]: requested };
  }

  if (allowed) return { [field]: { $in: allowed } };
  return {};
}

/** True when the signed-in user is a member of staff. */
export function isStaff(user: AuthUser): boolean {
  return STAFF_ROLES.includes(user.role);
}

/** Teachers may only touch the classes they are assigned to. */
export async function assertClassAccess(user: AuthUser, classId: string): Promise<void> {
  if (user.role === 'super_admin' || user.role === 'admin' || user.role === 'principal') return;

  const classRoom = await ClassRoom.findById(classId).select('teacherIds').lean();
  if (!classRoom) return;
  if (!classRoom.teacherIds.includes(user.id)) {
    const account = await User.findById(user.id).select('classIds classId').lean();
    const allowed =
      (account?.classIds ?? []).includes(classId) ||
      (user.role === 'student' && account?.classId === classId) ||
      user.role === 'parent';
    if (!allowed) throw ApiError.forbidden('You are not assigned to that class.');
  }
}
