/** Optional modules a school can switch on or off. Stored on the Setting document. */
export const FEATURE_KEYS = [
  'fees',
  'attendance',
  'timetable',
  'marks',
  'quizzes',
  'assignments',
  'exams',
  'announcements',
  'reports',
  'analytics',
  'library',
  'transport',
  'hostel',
  'chat',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export const DEFAULT_FEATURES: Record<FeatureKey, boolean> = {
  fees: true,
  attendance: true,
  timetable: true,
  marks: true,
  quizzes: true,
  assignments: true,
  exams: true,
  announcements: true,
  reports: true,
  analytics: true,
  library: false,
  transport: false,
  hostel: false,
  chat: false,
};

export function resolveFeatures(stored?: Record<string, boolean> | null): Record<FeatureKey, boolean> {
  const output = { ...DEFAULT_FEATURES };
  for (const key of FEATURE_KEYS) {
    if (stored && typeof stored[key] === 'boolean') output[key] = stored[key];
  }
  return output;
}
