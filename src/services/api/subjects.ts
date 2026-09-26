import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Subject } from '@/types';
import { CHART_COLORS } from '@/lib/constants';
import { http } from '../http';

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

export const emptySubject = (): SubjectInput => ({ name: '', code: '', classIds: [] });

export async function fetchSubjects(): Promise<Subject[]> {
  const { data } = await http.get<{ items: Subject[] }>('/subjects', { params: { pageSize: 200 } });
  return data.items;
}

export async function createSubject(input: SubjectInput): Promise<Subject> {
  const { data } = await http.post<{ subject: Subject }>('/subjects', {
    ...input,
    color: input.color ?? CHART_COLORS[0],
  });
  return data.subject;
}

export async function updateSubject(id: string, input: Partial<SubjectInput>): Promise<Subject> {
  const { data } = await http.patch<{ subject: Subject }>(`/subjects/${id}`, input);
  return data.subject;
}

export async function deleteSubject(id: string): Promise<{ id: string }> {
  await http.delete(`/subjects/${id}`);
  return { id };
}

/** Add / remove a subject from a class (used by the Subjects page chips). */
export async function toggleSubjectClass(subjectId: string, classId: string): Promise<Subject> {
  const { data } = await http.post<{ subject: Subject }>(`/subjects/${subjectId}/classes`, { classId });
  return data.subject;
}

// ---------------------------------------------------------------------------- hooks

export function useSubjects(options?: { enabled?: boolean }) {
  return useQuery({ queryKey: subjectKeys.list(), queryFn: fetchSubjects, enabled: options?.enabled });
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
