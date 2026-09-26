import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ClassRoom, ExamType, Mark, User } from '@/types';
import { http } from '../http';

export const markKeys = {
  all: ['marks'] as const,
  list: (filters?: MarkFilters) => [...markKeys.all, 'list', filters ?? {}] as const,
  reportCard: (studentId: string) => [...markKeys.all, 'report-card', studentId] as const,
  ranking: (classId: string) => [...markKeys.all, 'ranking', classId] as const,
};

export interface MarkFilters {
  classId?: string;
  studentId?: string;
  subjectId?: string;
  examType?: ExamType;
  title?: string;
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
  /** Filled in from the session on the server. */
  enteredBy?: string;
}

export interface ReportCardRow {
  subjectId: string;
  subjectName: string;
  obtained: number;
  total: number;
  percentage: number;
  grade: string;
}

export interface ReportCardData {
  student: User;
  classRoom: ClassRoom | null;
  rows: ReportCardRow[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: string;
  gpa: number;
  position: number;
  classSize: number;
}

export interface RankedStudent {
  studentId: string;
  name: string;
  rollNo: string;
  obtained: number;
  total: number;
  percentage: number;
  grade: string;
  position: number;
}

export async function fetchMarks(filters: MarkFilters = {}): Promise<Mark[]> {
  const { data } = await http.get<{ items: Mark[] }>('/marks', { params: { ...filters, pageSize: 500 } });
  return data.items;
}

/** Saves a whole subject column from the mark-entry sheet in one call. */
export async function saveMarks(inputs: MarkInput[]): Promise<Mark[]> {
  const { data } = await http.put<{ items: Mark[] }>('/marks', inputs);
  return data.items;
}

export async function deleteMark(id: string): Promise<{ id: string }> {
  await http.delete(`/marks/${id}`);
  return { id };
}

export async function fetchReportCard(studentId: string): Promise<ReportCardData> {
  const { data } = await http.get<ReportCardData>(`/marks/report-card/${studentId}`);
  return data;
}

export async function fetchRanking(classId: string): Promise<RankedStudent[]> {
  const { data } = await http.get<{ items: RankedStudent[] }>('/marks/ranking', { params: { classId } });
  return data.items;
}

/** Direct link used by the "Download result card" button. */
export function reportCardPdfUrl(studentId: string): string {
  return `/api/marks/report-card/${studentId}/pdf`;
}

// ---------------------------------------------------------------------------- hooks

export function useMarks(filters: MarkFilters = {}) {
  return useQuery({ queryKey: markKeys.list(filters), queryFn: () => fetchMarks(filters) });
}

export function useSaveMarks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveMarks,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: markKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useDeleteMark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMark,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: markKeys.all }),
  });
}

export function useReportCard(studentId: string | undefined) {
  return useQuery({
    queryKey: markKeys.reportCard(studentId ?? ''),
    queryFn: () => fetchReportCard(studentId as string),
    enabled: Boolean(studentId),
  });
}

export function useRanking(classId: string | undefined) {
  return useQuery({
    queryKey: markKeys.ranking(classId ?? ''),
    queryFn: () => fetchRanking(classId as string),
    enabled: Boolean(classId),
  });
}
