import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClassRoom } from '@/types';
import { http } from '../http';
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
  const { data } = await http.get<{ items: ClassRoom[] }>('/classes', { params: { pageSize: 200 } });
  return data.items;
}

export async function fetchClass(id: string): Promise<ClassRoom> {
  const { data } = await http.get<{ class: ClassRoom }>(`/classes/${id}`);
  return data.class;
}

export async function createClass(input: ClassInput): Promise<ClassRoom> {
  const { data } = await http.post<{ class: ClassRoom }>('/classes', input);
  return data.class;
}

export async function updateClass(id: string, input: Partial<ClassInput>): Promise<ClassRoom> {
  const { data } = await http.patch<{ class: ClassRoom }>(`/classes/${id}`, input);
  return data.class;
}

export async function deleteClass(id: string): Promise<{ id: string }> {
  await http.delete(`/classes/${id}`);
  return { id };
}

// ---------------------------------------------------------------------------- hooks

export function useClasses(options?: { enabled?: boolean }) {
  return useQuery({ queryKey: classKeys.list(), queryFn: fetchClasses, enabled: options?.enabled });
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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
