import type { Role } from '@/types';

/**
 * Capability-based permissions. Keeping permissions in one map (instead of scattering
 * `role === 'admin'` checks across pages) means new roles or modules can be added later
 * without refactoring the UI.
 */
export type Capability =
  | 'dashboard.view'
  | 'institutions.manage'
  | 'audit.view'
  | 'users.view'
  | 'users.manage'
  | 'classes.view'
  | 'classes.manage'
  | 'subjects.view'
  | 'subjects.manage'
  | 'timetable.view'
  | 'timetable.manage'
  | 'attendance.view'
  | 'attendance.take'
  | 'quizzes.view'
  | 'quizzes.manage'
  | 'quizzes.attempt'
  | 'quizzes.mark'
  | 'marks.view'
  | 'marks.viewOwn'
  | 'marks.enter'
  | 'fees.view'
  | 'fees.manage'
  | 'fees.viewOwn'
  | 'announcements.view'
  | 'announcements.manage'
  | 'reports.view';

const P: Record<Role, Capability[]> = {
  super_admin: [
    'dashboard.view',
    'institutions.manage',
    'audit.view',
    'users.view',
    'users.manage',
    'classes.view',
    'classes.manage',
    'subjects.view',
    'subjects.manage',
    'timetable.view',
    'timetable.manage',
    'attendance.view',
    'attendance.take',
    'quizzes.view',
    'quizzes.manage',
    'quizzes.mark',
    'marks.view',
    'marks.enter',
    'fees.view',
    'fees.manage',
    'announcements.view',
    'announcements.manage',
    'reports.view',
  ],
  admin: [
    'dashboard.view',
    'users.view',
    'users.manage',
    'classes.view',
    'classes.manage',
    'subjects.view',
    'subjects.manage',
    'timetable.view',
    'timetable.manage',
    'attendance.view',
    'quizzes.view',
    'marks.view',
    'fees.view',
    'fees.manage',
    'announcements.view',
    'announcements.manage',
    'reports.view',
  ],
  principal: [
    'dashboard.view',
    'users.view',
    'classes.view',
    'subjects.view',
    'timetable.view',
    'attendance.view',
    'quizzes.view',
    'marks.view',
    'fees.view',
    'announcements.view',
    'announcements.manage',
    'reports.view',
  ],
  teacher_incharge: [
    'dashboard.view',
    'classes.view',
    'classes.manage',
    'subjects.view',
    'subjects.manage',
    'timetable.view',
    'timetable.manage',
    'attendance.view',
    'attendance.take',
    'quizzes.view',
    'quizzes.manage',
    'quizzes.mark',
    'marks.view',
    'marks.enter',
    'announcements.view',
    'reports.view',
  ],
  teacher: [
    'dashboard.view',
    'classes.view',
    'subjects.view',
    'timetable.view',
    'attendance.view',
    'attendance.take',
    'quizzes.view',
    'quizzes.manage',
    'quizzes.mark',
    'marks.view',
    'marks.enter',
    'announcements.view',
  ],
  student: [
    'dashboard.view',
    'timetable.view',
    'attendance.view',
    'quizzes.view',
    'quizzes.attempt',
    'marks.view',
    'marks.viewOwn',
    'announcements.view',
  ],
  parent: [
    'dashboard.view',
    'timetable.view',
    'attendance.view',
    'marks.view',
    'marks.viewOwn',
    'fees.view',
    'fees.viewOwn',
    'announcements.view',
  ],
};

/** Does this role have the capability? */
export function can(role: Role | undefined | null, capability: Capability): boolean {
  if (!role) return false;
  return P[role]?.includes(capability) ?? false;
}

/** Does this role have at least one of the capabilities? */
export function canAny(role: Role | undefined | null, capabilities: Capability[]): boolean {
  return capabilities.some((capability) => can(role, capability));
}

/** Roles that manage school data (used to show "edit" affordances). */
export const STAFF_ROLES: Role[] = ['super_admin', 'admin', 'principal', 'teacher_incharge', 'teacher'];

/** Roles whose own data is being viewed rather than everyone's. */
export const SELF_SERVICE_ROLES: Role[] = ['student', 'parent'];
