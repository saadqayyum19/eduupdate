import type { Period, Role } from '@/types';

export const APP_NAME = 'EduCore Lite';
export const SCHOOL_NAME = 'Gujranwala Institute of Leather Technology';
export const SCHOOL_YEAR = '2025 – 2026';

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  principal: 'Principal',
  teacher_incharge: 'Teacher Incharge',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
};

/** Shown in the dev-only role switcher, in privilege order. */
export const ROLE_ORDER: Role[] = [
  'super_admin',
  'admin',
  'principal',
  'teacher_incharge',
  'teacher',
  'student',
  'parent',
];

export const ROLE_BADGE: Record<Role, string> = {
  super_admin: 'bg-violet-50 text-violet-700 border-violet-200',
  admin: 'bg-primary-50 text-primary-700 border-primary-200',
  principal: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  teacher_incharge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  teacher: 'bg-teal-50 text-teal-700 border-teal-200',
  student: 'bg-amber-50 text-amber-700 border-amber-200',
  parent: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const PERIODS: Period[] = [
  { number: 1, label: 'P1', start: '08:00', end: '08:45' },
  { number: 2, label: 'P2', start: '08:45', end: '09:30' },
  { number: 3, label: 'P3', start: '09:50', end: '10:35' },
  { number: 4, label: 'P4', start: '10:35', end: '11:20' },
  { number: 5, label: 'P5', start: '12:00', end: '12:45' },
  { number: 6, label: 'P6', start: '12:45', end: '13:30' },
];

export const EXAM_TYPES = ['quiz', 'midterm', 'final', 'assignment'] as const;

export const EXAM_TYPE_LABELS: Record<string, string> = {
  quiz: 'Quiz',
  midterm: 'Mid Term',
  final: 'Final Exam',
  assignment: 'Assignment',
};

export const ATTENDANCE_STATUSES = ['present', 'absent', 'late'] as const;

/** Chart palette — kept in one place so all Recharts look consistent. */
export const CHART_COLORS = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];
