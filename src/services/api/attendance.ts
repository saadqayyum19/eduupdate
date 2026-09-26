import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AttendanceRecord, AttendanceStatus } from '@/types';
import { getDb, mockDelay } from '../mockDb';

export const attendanceKeys = {
  all: ['attendance'] as const,
  list: (filters?: AttendanceFilters) => [...attendanceKeys.all, 'list', filters ?? {}] as const,
};

export interface AttendanceFilters {
  classId?: string;
  date?: string;
  studentId?: string;
}

export interface AttendanceInput {
  classId: string;
  date: string;
  markedBy: string;
  entries: Array<{ studentId: string; status: AttendanceStatus; note?: string }>;
}

export async function fetchAttendance(filters: AttendanceFilters = {}): Promise<AttendanceRecord[]> {
  await mockDelay();
  return getDb().attendance.filter(
    (record) =>
      (filters.classId ? record.classId === filters.classId : true) &&
      (filters.date ? record.date === filters.date : true) &&
      (filters.studentId ? record.studentId === filters.studentId : true),
  );
}

/** Save a whole day's roster in one call — exactly what the Express route will do. */
export async function saveRoster(input: AttendanceInput): Promise<AttendanceRecord[]> {
  await mockDelay(450);
  const db = getDb();

  const saved = input.entries.map((entry) => {
    const existing = db.attendance.find(
      (record) =>
        record.classId === input.classId &&
        record.date === input.date &&
        record.studentId === entry.studentId,
    );

    if (existing) {
      existing.status = entry.status;
      existing.note = entry.note;
      existing.markedBy = input.markedBy;
      return existing;
    }

    const record: AttendanceRecord = {
      id: `att-${input.classId}-${entry.studentId}-${input.date}`,
      classId: input.classId,
      studentId: entry.studentId,
      date: input.date,
      status: entry.status,
      note: entry.note,
      markedBy: input.markedBy,
    };
    db.attendance.push(record);
    return record;
  });

  return saved;
}

// ---------------------------------------------------------------------------- hooks

export function useAttendance(filters: AttendanceFilters = {}) {
  return useQuery({
    queryKey: attendanceKeys.list(filters),
    queryFn: () => fetchAttendance(filters),
  });
}

export function useSaveRoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveRoster,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: attendanceKeys.all }),
  });
}
