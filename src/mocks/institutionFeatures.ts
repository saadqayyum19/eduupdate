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

let features: InstitutionFeatureMap = {
  fees: true,
  transport: false,
  hostel: false,
  library: true,
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

const CHANGE_EVENT = 'educore:institution-features-changed';

export function getInstitutionFeatures(): InstitutionFeatureMap {
  return { ...features };
}

export function setInstitutionFeature(feature: InstitutionFeature, enabled: boolean): InstitutionFeatureMap {
  features = { ...features, [feature]: enabled };
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return getInstitutionFeatures();
}

export function subscribeInstitutionFeatures(listener: (next: InstitutionFeatureMap) => void): () => void {
  const onChange = () => listener(getInstitutionFeatures());
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}
