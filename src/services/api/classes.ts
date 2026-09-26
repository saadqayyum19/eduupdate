import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClassRoom } from '@/types';
import { getDb, mockDelay, nextId } from '../mockDb';
import { purgeClassReferences, reconcileClass } from '../cascade';
import { userKeys } from './users';

export const classKeys = {
  all: ['classes'] as const,
  list: () => [...classKeys.all, 'list'] as const,
  detail: (id: string) => [...classKeys.all, 'detail', id] as const,
};

export interface ClassInput {
  name: string;
  section: string;
  room?: string;
  teacherIds: string[];
  inchargeId: string | null;
  subjectIncharges: Record<string, string | null>;
  studentIds: string[];
  subjectIds: string[];
}

export const emptyClass = (): ClassInput => ({
  name: '',
  section: 'A',
  room: '',
  teacherIds: [],
  inchargeId: null,
  subjectIncharges: {},
  studentIds: [],
  subjectIds: [],
});

export async function fetchClasses(): Promise<ClassRoom[]> {
  await mockDelay();
  return [...getDb().classes].sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchClass(id: string): Promise<ClassRoom> {
  await mockDelay();
  const classRoom = getDb().classes.find((item) => item.id === id);
  if (!classRoom) throw new Error('That class could not be found.');
  return classRoom;
}

export async function createClass(input: ClassInput): Promise<ClassRoom> {
  await mockDelay(500);
  const db = getDb();
  const classRoom: ClassRoom = {
    ...input,
    id: nextId('c'),
    createdAt: new Date().toISOString().slice(0, 10),
  };
  db.classes.push(classRoom);

  // One helper keeps students, teachers, subjects, incharges and the timetable coherent.
  reconcileClass(classRoom.id);

  return classRoom;
}

export async function updateClass(id: string, input: Partial<ClassInput>): Promise<ClassRoom> {
  await mockDelay();
  const db = getDb();
  const index = db.classes.findIndex((item) => item.id === id);
  if (index === -1) throw new Error('That class could not be found.');

  db.classes[index] = { ...db.classes[index], ...input };

  // Membership edits (add/remove students or teachers) must ripple to the user records.
  reconcileClass(id);

  return db.classes[index];
}

export async function deleteClass(id: string): Promise<{ id: string }> {
  await mockDelay();
  const db = getDb();

  db.classes = db.classes.filter((item) => item.id !== id);
  purgeClassReferences(id);

  return { id };
}

// ---------------------------------------------------------------------------- hooks

export function useClasses(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: classKeys.list(),
    queryFn: fetchClasses,
    enabled: options?.enabled,
  });
}

export function useClass(id: string | undefined) {
  return useQuery({
    queryKey: classKeys.detail(id ?? ''),
    queryFn: () => fetchClass(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}

export function useUpdateClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ClassInput> }) => updateClass(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.all });
      // Membership changes also rewrite user + subject documents.
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
  });
}

export function useDeleteClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteClass,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classKeys.all });
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['marks'] });
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['fees'] });
    },
  });
}
