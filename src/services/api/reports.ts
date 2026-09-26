import { useQuery } from '@tanstack/react-query';
import { http } from '../http';

export type ReportType = 'academic' | 'attendance' | 'finance';

export interface ReportQuery {
  classId?: string;
  from?: string;
  to?: string;
}

export type ReportRow = Record<string, string | number>;

export const reportKeys = {
  all: ['reports'] as const,
  one: (type: ReportType, query: ReportQuery) => [...reportKeys.all, type, query] as const,
};

export async function fetchReport(type: ReportType, query: ReportQuery = {}): Promise<ReportRow[]> {
  const { data } = await http.get<{ items: ReportRow[] }>(`/reports/${type}`, { params: query });
  return data.items;
}

/** Direct download URL for the CSV export of any report. */
export function reportCsvUrl(type: ReportType, query: ReportQuery = {}): string {
  const params = new URLSearchParams({ format: 'csv', ...query } as Record<string, string>);
  return `/api/reports/${type}?${params.toString()}`;
}

export function useReport(type: ReportType, query: ReportQuery = {}) {
  return useQuery({ queryKey: reportKeys.one(type, query), queryFn: () => fetchReport(type, query) });
}
