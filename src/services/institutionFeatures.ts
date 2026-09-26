import { http } from '@/services/http';

/**
 * Institution feature flags (which modules the school has switched on).
 *
 * The values are persisted in the Setting document and come from `GET /api/settings/public`
 * so the sidebar and route guards hide modules the school has turned off.
 */

export type InstitutionFeature =
  | 'fees'
  | 'transport'
  | 'hostel'
  | 'library'
  | 'assignments'
  | 'quizzes'
  | 'analytics'
  | 'chat'
  | 'announcements'
  | 'attendance'
  | 'timetable'
  | 'marks'
  | 'reports'
  | 'exams';

export type InstitutionFeatureMap = Record<InstitutionFeature, boolean>;

export const INSTITUTION_FEATURES: InstitutionFeature[] = [
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
];

/** Everything on except the optional modules a school opts into. */
export const DEFAULT_FEATURES: InstitutionFeatureMap = {
  fees: true,
  transport: false,
  hostel: false,
  library: false,
  assignments: true,
  quizzes: true,
  analytics: true,
  chat: false,
  announcements: true,
  attendance: true,
  timetable: true,
  marks: true,
  reports: true,
  exams: true,
};

let features: InstitutionFeatureMap = { ...DEFAULT_FEATURES };
const listeners = new Set<(next: InstitutionFeatureMap) => void>();

function emit(): void {
  listeners.forEach((listener) => listener(getInstitutionFeatures()));
}

export function getInstitutionFeatures(): InstitutionFeatureMap {
  return { ...features };
}

/** Applied once the settings payload arrives. */
export function applyFeatures(next: Partial<InstitutionFeatureMap> | undefined): void {
  features = { ...DEFAULT_FEATURES, ...(next ?? {}) };
  emit();
}

export function setInstitutionFeature(feature: InstitutionFeature, enabled: boolean): InstitutionFeatureMap {
  features = { ...features, [feature]: enabled };
  emit();
  return getInstitutionFeatures();
}

/** Persists a feature toggle (super admin only) and updates local state. */
export async function saveInstitutionFeature(feature: InstitutionFeature, enabled: boolean): Promise<void> {
  await http.patch('/settings/features', { [feature]: enabled });
  setInstitutionFeature(feature, enabled);
}

export function subscribeInstitutionFeatures(listener: (next: InstitutionFeatureMap) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
