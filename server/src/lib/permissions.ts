import type { Role } from '../models/User';

/**
 * Capability-based permissions — the single source of truth for authorisation.
 * Kept identical to `src/lib/permissions.ts` on the client so the UI and the API
 * can never disagree about who may do what.
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
    'dashboard.view', 'institutions.manage', 'audit.view', 'users.view', 'users.manage',
    'classes.view', 'classes.manage', 'subjects.view', 'subjects.manage', 'timetable.view',
    'timetable.manage', 'attendance.view', 'attendance.take', 'quizzes.view', 'quizzes.manage',
    'quizzes.mark', 'marks.view', 'marks.enter', 'fees.view', 'fees.manage', 'announcements.view',
    'announcements.manage', 'reports.view',
  ],
  admin: [
    'dashboard.view', 'users.view', 'users.manage', 'classes.view', 'classes.manage', 'subjects.view',
    'subjects.manage', 'timetable.view', 'timetable.manage', 'attendance.view', 'quizzes.view',
    'marks.view', 'fees.view', 'fees.manage', 'announcements.view', 'announcements.manage',
    'reports.view',
  ],
  principal: [
    'dashboard.view', 'users.view', 'classes.view', 'subjects.view', 'timetable.view',
    'attendance.view', 'quizzes.view', 'marks.view', 'fees.view', 'announcements.view',
    'announcements.manage', 'reports.view',
  ],
  teacher_incharge: [
    'dashboard.view', 'classes.view', 'classes.manage', 'subjects.view', 'subjects.manage',
    'timetable.view', 'timetable.manage', 'attendance.view', 'attendance.take', 'quizzes.view',
    'quizzes.manage', 'quizzes.mark', 'marks.view', 'marks.enter', 'announcements.view',
    'reports.view',
  ],
  teacher: [
    'dashboard.view', 'classes.view', 'subjects.view', 'timetable.view', 'attendance.view',
    'attendance.take', 'quizzes.view', 'quizzes.manage', 'quizzes.mark', 'marks.view',
    'marks.enter', 'announcements.view',
  ],
  student: [
    'dashboard.view', 'timetable.view', 'attendance.view', 'quizzes.view', 'quizzes.attempt',
    'marks.view', 'marks.viewOwn', 'announcements.view',
  ],
  parent: [
    'dashboard.view', 'timetable.view', 'attendance.view', 'marks.view', 'marks.viewOwn',
    'fees.view', 'fees.viewOwn', 'announcements.view',
  ],
};

export function can(role: Role | undefined | null, capability: Capability): boolean {
  if (!role) return false;
  return P[role]?.includes(capability) ?? false;
}

export const STAFF_ROLES: Role[] = ['super_admin', 'admin', 'principal', 'teacher_incharge', 'teacher'];
export const SELF_SERVICE_ROLES: Role[] = ['student', 'parent'];
