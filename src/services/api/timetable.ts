import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TimetableSlot, WeekDay } from '@/types';
import { http } from '../http';

export const timetableKeys = {
  all: ['timetable'] as const,
  list: (classId?: string) => [...timetableKeys.all, 'list', classId ?? 'all'] as const,
};

export interface TimetableSlotInput {
  classId: string;
  day: WeekDay;
  period: number;
  subjectId: string;
  teacherId: string | null;
  room?: string;
}

export async function fetchTimetable(classId?: string): Promise<TimetableSlot[]> {
  const { data } = await http.get<{ items: TimetableSlot[] }>('/timetable', {
    params: { classId, pageSize: 200 },
  });
  return data.items;
}

export async function upsertSlot(input: TimetableSlotInput): Promise<TimetableSlot> {
  const { data } = await http.put<{ slot: TimetableSlot }>('/timetable', input);
  return data.slot;
}

export async function clearSlot(input: { classId: string; day: WeekDay; period: number }) {
  await http.delete('/timetable', { data: input });
  return input;
}

// ---------------------------------------------------------------------------- hooks

export function useTimetable(classId?: string) {
  return useQuery({ queryKey: timetableKeys.list(classId), queryFn: () => fetchTimetable(classId) });
}

export function useUpsertSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertSlot,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.all }),
  });
}

export function useClearSlot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearSlot,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: timetableKeys.all }),
  });
}
