import type { Subject } from '@/types';
import { classes } from './classes';

const catalog = [
  ['s-math', 'Applied Mathematics', 'CIT-109', '#2563eb'],
  ['s-sci', 'Applied Physics', 'CIT-113', '#10b981'],
  ['s-eng', 'English Communication', 'CIT-111', '#f59e0b'],
  ['s-sst', 'Entrepreneurship', 'GEN-118', '#8b5cf6'],
  ['s-cs', 'Computer Programming (C++)', 'CIT-101', '#06b6d4'],
  ['s-cit-network', 'Networking Fundamentals', 'CIT-104', '#0891b2'],
  ['s-cit-db', 'Database Management Systems', 'CIT-103', '#059669'],
  ['s-cit-web', 'Web Designing & Development', 'CIT-102', '#d97706'],
  ['s-cit-os', 'Operating Systems', 'CIT-105', '#dc2626'],
  ['s-cit-dsa', 'Data Structures & Algorithms', 'CIT-107', '#db2777'],
  ['s-cit-project', 'Final Year Project', 'CIT-120', '#4f46e5'],
  ['s-ft-design', 'Footwear Design & Pattern Making', 'FT-101', '#0d9488'],
  ['s-ft-material', 'Material Science for Footwear', 'FT-104', '#ca8a04'],
  ['s-ft-production', 'Production Management', 'FT-106', '#9333ea'],
  ['s-lt-tanning', 'Tanning Technology', 'LT-102', '#0284c7'],
  ['s-lt-chemistry', 'Chemistry of Leather', 'LT-104', '#65a30d'],
  ['s-lt-quality', 'Leather Testing & Quality', 'LT-105', '#e11d48'],
  ['s-da-python', 'Python for Data Analysis', 'DA-201', '#0f766e'],
  ['s-da-statistics', 'Statistics & Probability', 'DA-202', '#b45309'],
  ['s-ca-anatomy', 'Anatomy & Physiology', 'CA-301', '#be123c'],
  ['s-ca-procedures', 'Clinical Procedures', 'CA-302', '#4338ca'],
] as const;

/** 21 Gujranwala technical-program subjects with explicit cohort assignments. */
export const subjects: Subject[] = catalog.map(([id, name, code, color]) => ({
  id,
  name,
  code,
  color,
  classIds: classes.filter((classRoom) => classRoom.subjectIds.includes(id)).map((classRoom) => classRoom.id),
}));
