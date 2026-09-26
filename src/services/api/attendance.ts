import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AttendanceRecord, AttendanceStatus } from '@/types';
import { http } from '../http';

export const attendanceKeys = {
  all: ['attendance'] as const,
  list: (filters?: AttendanceFilters) => [...attendanceKeys.all, 'list', filters ?? {}] as const,
};

export interface AttendanceFilters {
  classId?: string;
  date?: string;
  from?: string;
  to?: string;
  studentId?: string;
}

export interface AttendanceInput {
  classId: string;
  date: string;
  /** Derived from the session on the server; kept optional for the UI's convenience. */
  markedBy?: string;
  entries: Array<{ studentId: string; status: AttendanceStatus; note?: string }>;
}

export async function fetchAttendance(filters: AttendanceFilters = {}): Promise<AttendanceRecord[]> {
  const { data } = await http.get<{ items: AttendanceRecord[] }>('/attendance', {
    params: { ...filters, pageSize: 500 },
  });
  return data.items;
}

/** Saves a whole day's roster in one call. */
export async function saveRoster(input: AttendanceInput): Promise<AttendanceRecord[]> {
  const { data } = await http.put<{ items: AttendanceRecord[] }>('/attendance/roster', {
    classId: input.classId,
    date: input.date,
    entries: input.entries,
  });
  return data.items;
}

// ---------------------------------------------------------------------------- hooks

export function useAttendance(filters: AttendanceFilters = {}) {
  return useQuery({ queryKey: attendanceKeys.list(filters), queryFn: () => fetchAttendance(filters) });
}

export function useSaveRoster() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveRoster,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
