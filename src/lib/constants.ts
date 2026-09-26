import type { Period, Role } from '@/types';

export const APP_NAME = 'EduCore Lite';

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  principal: 'Principal',
  teacher_incharge: 'Teacher Incharge',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
};

/** Roles an administrator may assign when creating an account. */
export const ROLE_OPTIONS: Role[] = [
  'admin',
  'principal',
  'teacher_incharge',
  'teacher',
  'student',
  'parent',
];

export const CURRENCIES = [
  'PKR',
  'INR',
  'USD',
  'EUR',
  'GBP',
  'AED',
  'SAR',
  'AUD',
  'CAD',
  'MYR',
  'NGN',
  'KES',
  'BDT',
  'LKR',
];

export const TIMEZONES = [
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Dhaka',
  'Asia/Colombo',
  'Asia/Kuala_Lumpur',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Toronto',
  'Australia/Sydney',
  'UTC',
];

export const FEE_FREQUENCIES = ['monthly', 'termly', 'yearly', 'one-time'] as const;

export const PAYMENT_METHODS = ['cash', 'card', 'bank', 'upi'] as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  bank: 'Bank transfer',
  upi: 'Online transfer',
};

export const ACADEMIC_TERMS = ['Term 1', 'Term 2', 'Term 3', 'Annual'];

export interface GradeBand {
  grade: string;
  gpa: number;
  min: number;
  max: number;
}

/** Default grade bands — editable in Settings and used for every report card. */
export const DEFAULT_GRADE_BANDS: GradeBand[] = [
  { grade: 'A+', gpa: 4.0, min: 90, max: 100 },
  { grade: 'A', gpa: 3.7, min: 80, max: 89 },
  { grade: 'B', gpa: 3.3, min: 70, max: 79 },
  { grade: 'C', gpa: 2.7, min: 60, max: 69 },
  { grade: 'D', gpa: 2.0, min: 50, max: 59 },
  { grade: 'E', gpa: 1.0, min: 40, max: 49 },
  { grade: 'F', gpa: 0, min: 0, max: 39 },
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
