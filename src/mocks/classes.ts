import type { ClassRoom } from '@/types';
import { users } from './users';

/**
 * Twelve Gujranwala training cohorts: three DAE programs, two short courses,
 * and their teacher, subject and student relationships.
 */
const cohorts = [
  { id: 'c-10a', program: 'cit', name: 'DAE CIT · Year 1' },
  { id: 'c-cit-y2', program: 'cit', name: 'DAE CIT · Year 2' },
  { id: 'c-8a', program: 'cit', name: 'DAE CIT · Year 3' },
  { id: 'c-ft-y1', program: 'footwear', name: 'DAE Footwear · Year 1' },
  { id: 'c-ft-y2', program: 'footwear', name: 'DAE Footwear · Year 2' },
  { id: 'c-ft-y3', program: 'footwear', name: 'DAE Footwear · Year 3' },
  { id: 'c-lt-y1', program: 'leather', name: 'DAE Leather · Year 1' },
  { id: 'c-lt-y2', program: 'leather', name: 'DAE Leather · Year 2' },
  { id: 'c-lt-y3', program: 'leather', name: 'DAE Leather · Year 3' },
  { id: 'c-data-1', program: 'analytics', name: 'Data Analytics · Batch 1' },
  { id: 'c-data-2', program: 'analytics', name: 'Data Analytics · Batch 2' },
  { id: 'c-clinical-1', program: 'clinical', name: 'Clinical Assistant · Batch 1' },
];

const subjectsByProgram: Record<string, string[]> = {
  cit: ['s-math', 's-sci', 's-eng', 's-cs', 's-cit-network', 's-cit-db', 's-cit-web', 's-cit-os', 's-cit-dsa', 's-cit-project'],
  footwear: ['s-sci', 's-eng', 's-sst', 's-ft-design', 's-ft-material', 's-ft-production'],
  leather: ['s-sci', 's-eng', 's-sst', 's-lt-tanning', 's-lt-chemistry', 's-lt-quality'],
  analytics: ['s-cs', 's-math', 's-da-python', 's-da-statistics'],
  clinical: ['s-sci', 's-eng', 's-ca-anatomy', 's-ca-procedures'],
};
const incharges = ['u-t-priya', 'u-t-incharge-2', 'u-t-incharge-3', 'u-t-incharge-4'];
const teacherPool = [
  'u-t-priya', 'u-t-rakesh', 'u-t-sneha', 'u-t-imran',
  ...Array.from({ length: 9 }, (_, index) => `u-t-extra-${index + 1}`),
  'u-t-incharge-2', 'u-t-incharge-3', 'u-t-incharge-4',
];

export const classes: ClassRoom[] = cohorts.map((cohort, index) => {
  const subjectIds = subjectsByProgram[cohort.program];
  const teacherIds = [incharges[index % incharges.length], teacherPool[(index + 1) % teacherPool.length], teacherPool[(index + 4) % teacherPool.length]];
  return {
    id: cohort.id,
    name: cohort.name,
    section: index % 3 === 0 ? 'A' : index % 3 === 1 ? 'B' : 'C',
    room: index >= 9 ? `Lab ${index - 8}` : `Workshop ${101 + index}`,
    teacherIds,
    inchargeId: teacherIds[0],
    subjectIncharges: Object.fromEntries(subjectIds.map((subjectId, subjectIndex) => [subjectId, teacherIds[subjectIndex % teacherIds.length]])),
    studentIds: users.filter((user) => user.role === 'student' && user.classId === cohort.id).map((user) => user.id),
    subjectIds,
    createdAt: '2025-08-01',
  };
});
