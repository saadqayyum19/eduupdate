import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TimetableSlot, WeekDay } from '@/types';
import { getDb, mockDelay, nextId } from '../mockDb';

export const timetableKeys = {
  all: ['timetable'] as const,
  list: (classId?: string) => [...timetableKeys.all, 'list', classId ?? 'all'] as const,
};

export interface TimetableSlotInput {
  classId: string;
  day: WeekDay;
  period: number;
  subjectId: string;
  teacherId: string;
  room?: string;
}

export async function fetchTimetable(classId?: string): Promise<TimetableSlot[]> {
  await mockDelay();
  return getDb().timetable.filter((slot) => (classId ? slot.classId === classId : true));
}

export async function upsertSlot(input: TimetableSlotInput): Promise<TimetableSlot> {
  await mockDelay(200);
  const db = getDb();
  const existing = db.timetable.find(
    (slot) => slot.classId === input.classId && slot.day === input.day && slot.period === input.period,
  );

  if (existing) {
    Object.assign(existing, input);
    return existing;
  }

  const slot: TimetableSlot = { ...input, id: nextId('tt') };
  db.timetable.push(slot);
  return slot;
}

export async function clearSlot(input: { classId: string; day: WeekDay; period: number }) {
  await mockDelay(200);
  const db = getDb();
  db.timetable = db.timetable.filter(
    (slot) => !(slot.classId === input.classId && slot.day === input.day && slot.period === input.period),
  );
  return input;
}

// ---------------------------------------------------------------------------- hooks

export function useTimetable(classId?: string) {
  return useQuery({
    queryKey: timetableKeys.list(classId),
    queryFn: () => fetchTimetable(classId),
  });
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
