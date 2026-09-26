import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExamType, Mark } from '@/types';
import { getDb, mockDelay, nextId } from '../mockDb';

export const markKeys = {
  all: ['marks'] as const,
  list: (filters?: MarkFilters) => [...markKeys.all, 'list', filters ?? {}] as const,
};

export interface MarkFilters {
  classId?: string;
  studentId?: string;
  subjectId?: string;
}

export interface MarkInput {
  studentId: string;
  classId: string;
  subjectId: string;
  examType: ExamType;
  title: string;
  score: number;
  total: number;
  date: string;
  enteredBy: string;
}

export async function fetchMarks(filters: MarkFilters = {}): Promise<Mark[]> {
  await mockDelay();
  return getDb().marks.filter(
    (mark) =>
      (filters.classId ? mark.classId === filters.classId : true) &&
      (filters.studentId ? mark.studentId === filters.studentId : true) &&
      (filters.subjectId ? mark.subjectId === filters.subjectId : true),
  );
}

/** Save a whole subject column from the mark-entry sheet in one call. */
export async function saveMarks(inputs: MarkInput[]): Promise<Mark[]> {
  await mockDelay(450);
  const db = getDb();
  return inputs.map((input) => {
    const existing = db.marks.find(
      (mark) =>
        mark.studentId === input.studentId &&
        mark.subjectId === input.subjectId &&
        mark.examType === input.examType &&
        mark.title === input.title,
    );
    if (existing) {
      existing.score = input.score;
      existing.total = input.total;
      existing.date = input.date;
      existing.enteredBy = input.enteredBy;
      return existing;
    }
    const mark: Mark = { ...input, id: nextId('mk') };
    db.marks.push(mark);
    return mark;
  });
}

export async function deleteMark(id: string): Promise<{ id: string }> {
  await mockDelay();
  const db = getDb();
  db.marks = db.marks.filter((mark) => mark.id !== id);
  return { id };
}

// ---------------------------------------------------------------------------- hooks

export function useMarks(filters: MarkFilters = {}) {
  return useQuery({ queryKey: markKeys.list(filters), queryFn: () => fetchMarks(filters) });
}

export function useSaveMarks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveMarks,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: markKeys.all }),
  });
}

export function useDeleteMark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMark,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: markKeys.all }),
  });
}
