import { useQuery } from '@tanstack/react-query';
import type { Role } from '@/types';
import { today } from '@/lib/utils';
import { http } from '../http';

/** One aggregated payload that every role dashboard renders. */

export interface SeriesPoint {
  label: string;
  present: number;
  absent: number;
  late: number;
}

export interface PeriodRow {
  period: string;
  time: string;
  subjectId: string;
  className: string;
}

export interface DashboardData {
  scopeLabel: string;
  attendance: { percent: number; series: SeriesPoint[]; present: number; absent: number; late: number };
  marks: { percent: number; grade?: string; bySubject: Array<{ label: string; value: number }> };
  fees: {
    collected: number;
    pending: number;
    split: Array<{ label: string; value: number }>;
    paidCount: number;
    unpaidCount: number;
  };
  todayPeriods: PeriodRow[];
  subjectCount: number;
  quizCount: number;
  studentCount: number;
  teacherCount: number;
  parentCount: number;
  classCount: number;
  announcementCount: number;
  pendingApprovals: number;
  topStudents: Array<{ id: string; name: string; percent: number }>;
}

export async function fetchDashboard(_input?: { role: Role; userId: string }): Promise<DashboardData> {
  const { data } = await http.get<DashboardData>('/dashboard');
  return data;
}

export function useDashboard(role: Role, userId: string) {
  return useQuery({
    queryKey: ['dashboard', role, userId, today()],
    queryFn: () => fetchDashboard({ role, userId }),
  });
}
