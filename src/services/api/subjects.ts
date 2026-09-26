import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Subject } from '@/types';
import { CHART_COLORS } from '@/lib/constants';
import { getDb, mockDelay, nextId } from '../mockDb';
import { purgeSubjectReferences, reconcileClass } from '../cascade';

export const subjectKeys = {
  all: ['subjects'] as const,
  list: () => [...subjectKeys.all, 'list'] as const,
};

export interface SubjectInput {
  name: string;
  code: string;
  classIds: string[];
  color?: string;
}

export async function fetchSubjects(): Promise<Subject[]> {
  await mockDelay();
  return [...getDb().subjects].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createSubject(input: SubjectInput): Promise<Subject> {
  await mockDelay();
  const subjects = getDb().subjects;
  const subject: Subject = {
    id: nextId('s'),
    name: input.name.trim(),
    code: input.code.trim().toUpperCase(),
    classIds: input.classIds,
    color: input.color ?? CHART_COLORS[subjects.length % CHART_COLORS.length],
  };
  subjects.push(subject);
  return subject;
}

export async function updateSubject(id: string, input: Partial<SubjectInput>): Promise<Subject> {
  await mockDelay();
  const subjects = getDb().subjects;
  const index = subjects.findIndex((item) => item.id === id);
  if (index === -1) throw new Error('That subject could not be found.');
  subjects[index] = { ...subjects[index], ...input };
  return subjects[index];
}

export async function deleteSubject(id: string): Promise<{ id: string }> {
  await mockDelay();
  const db = getDb();

  db.subjects = db.subjects.filter((item) => item.id !== id);
  purgeSubjectReferences(id);

  return { id };
}

/** Add / remove a subject from a class (used by the Subjects page chips). */
export async function toggleSubjectClass(subjectId: string, classId: string): Promise<Subject> {
  await mockDelay(250);
  const db = getDb();
  const subject = db.subjects.find((item) => item.id === subjectId);
  if (!subject) throw new Error('That subject could not be found.');

  const classRoom = db.classes.find((item) => item.id === classId);
  if (!classRoom) throw new Error('That class could not be found.');

  // Write the link once (on the class) and let the reconciler mirror it onto the subject.
  classRoom.subjectIds = classRoom.subjectIds.includes(subjectId)
    ? classRoom.subjectIds.filter((id) => id !== subjectId)
    : [...classRoom.subjectIds, subjectId];

  reconcileClass(classId);

  return subject;
}

// ---------------------------------------------------------------------------- hooks

export function useSubjects(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: subjectKeys.list(),
    queryFn: fetchSubjects,
    enabled: options?.enabled,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subjectKeys.all });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<SubjectInput> }) => updateSubject(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subjectKeys.all }),
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subjectKeys.all });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      queryClient.invalidateQueries({ queryKey: ['marks'] });
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });
}

export function useToggleSubjectClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subjectId, classId }: { subjectId: string; classId: string }) =>
      toggleSubjectClass(subjectId, classId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subjectKeys.all });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}
