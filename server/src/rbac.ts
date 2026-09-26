/**
 * Role-Based Access Control for the EduCore API.
 *
 * Mirrors the frontend capability map (`src/lib/permissions.ts`) so a single
 * mental model covers both layers: every route requires a capability, and each
 * role owns an explicit capability list.
 */

export type Role =
  | 'super_admin'
  | 'admin'
  | 'principal'
  | 'teacher_incharge'
  | 'teacher'
  | 'student'
  | 'parent';

export const ALL_ROLES: Role[] = [
  'super_admin',
  'admin',
  'principal',
  'teacher_incharge',
  'teacher',
  'student',
  'parent',
];

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
  | 'programs.view'
  | 'programs.manage'
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
  | 'results.viewOwn'
  | 'fees.view'
  | 'fees.manage'
  | 'fees.viewOwn'
  | 'announcements.view'
  | 'announcements.manage'
  | 'assignments.view'
  | 'assignments.manage'
  | 'assignments.submit'
  | 'reports.view'
  | 'analytics.view'
  | 'chat.use';

const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  super_admin: [
    'dashboard.view', 'institutions.manage', 'audit.view',
    'users.view', 'users.manage',
    'classes.view', 'classes.manage',
    'subjects.view', 'subjects.manage',
    'programs.view', 'programs.manage',
    'timetable.view', 'timetable.manage',
    'attendance.view', 'attendance.take',
    'quizzes.view', 'quizzes.manage', 'quizzes.mark',
    'marks.view', 'marks.enter',
    'fees.view', 'fees.manage',
    'announcements.view', 'announcements.manage',
    'assignments.view', 'assignments.manage',
    'reports.view', 'analytics.view', 'chat.use',
  ],
  admin: [
    'dashboard.view',
    'users.view', 'users.manage',
    'classes.view', 'classes.manage',
    'subjects.view', 'subjects.manage',
    'programs.view', 'programs.manage',
    'timetable.view', 'timetable.manage',
    'attendance.view',
    'quizzes.view', 'quizzes.manage',
    'marks.view', 'marks.enter',
    'fees.view', 'fees.manage',
    'announcements.view', 'announcements.manage',
    'assignments.view', 'assignments.manage',
    'reports.view', 'analytics.view', 'chat.use',
  ],
  principal: [
    'dashboard.view',
    'users.view',
    'classes.view',
    'subjects.view',
    'programs.view',
    'timetable.view',
    'attendance.view',
    'quizzes.view',
    'marks.view', 'marks.enter',
    'fees.view',
    'announcements.view', 'announcements.manage',
    'assignments.view',
    'reports.view', 'analytics.view', 'chat.use',
  ],
  teacher_incharge: [
    'dashboard.view',
    'classes.view', 'classes.manage',
    'subjects.view', 'subjects.manage',
    'programs.view',
    'timetable.view', 'timetable.manage',
    'attendance.view', 'attendance.take',
    'quizzes.view', 'quizzes.manage', 'quizzes.mark',
    'marks.view', 'marks.enter',
    'announcements.view',
    'assignments.view', 'assignments.manage',
    'reports.view', 'chat.use',
  ],
  teacher: [
    'dashboard.view',
    'classes.view',
    'subjects.view',
    'programs.view',
    'timetable.view',
    'attendance.view', 'attendance.take',
    'quizzes.view', 'quizzes.manage', 'quizzes.mark',
    'marks.view', 'marks.enter',
    'announcements.view',
    'assignments.view', 'assignments.manage',
    'chat.use',
  ],
  student: [
    'dashboard.view',
    'programs.view',
    'timetable.view',
    'attendance.view',
    'quizzes.view', 'quizzes.attempt',
    'marks.view', 'marks.viewOwn', 'results.viewOwn',
    'announcements.view',
    'assignments.view',
    'assignments.submit',
    'chat.use',
  ],
  parent: [
    'dashboard.view',
    'programs.view',
    'timetable.view',
    'attendance.view',
    'quizzes.view',
    'marks.view', 'marks.viewOwn', 'results.viewOwn',
    'fees.view', 'fees.viewOwn',
    'announcements.view',
    'assignments.view',
    'chat.use',
  ],
};

export function can(role: Role | undefined | null, capability: Capability): boolean {
  if (!role) return false;
  return ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}

export function capabilitiesFor(role: Role): Capability[] {
  return [...(ROLE_CAPABILITIES[role] ?? [])];
}
