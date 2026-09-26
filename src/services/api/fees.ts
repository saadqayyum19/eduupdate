import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FeeFrequency, FeePayment, FeeStatus, FeeStructure } from '@/types';
import { http } from '../http';

export const feeKeys = {
  all: ['fees'] as const,
  structures: () => [...feeKeys.all, 'structures'] as const,
  payments: (filters?: FeeFilters) => [...feeKeys.all, 'payments', filters ?? {}] as const,
  summary: () => [...feeKeys.all, 'summary'] as const,
};

export interface FeeFilters {
  studentId?: string;
  classId?: string;
  structureId?: string;
  status?: FeeStatus | 'all';
  search?: string;
}

export interface FeeStructureInput {
  classId: string;
  title: string;
  amount: number;
  frequency: FeeFrequency;
  dueDate: string;
}

/** An invoice row enriched with the student and class names the table shows. */
export interface InvoiceRow extends FeePayment {
  studentName: string;
  rollNo: string;
  classId: string;
  className: string;
  structureTitle: string;
  receipts?: Array<{
    amount: number;
    method: string;
    reference: string;
    paidOn: string;
    note?: string;
  }>;
}

export interface FeeSummaryPayload {
  billed: number;
  collected: number;
  outstanding: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  overdues: number;
}

export async function fetchFeeStructures(): Promise<FeeStructure[]> {
  const { data } = await http.get<{ items: FeeStructure[] }>('/fees/structures', { params: { pageSize: 200 } });
  return data.items;
}

export async function fetchFeePayments(filters: FeeFilters = {}): Promise<InvoiceRow[]> {
  const { data } = await http.get<{ items: InvoiceRow[] }>('/fees/invoices', {
    params: {
      pageSize: 500,
      studentId: filters.studentId,
      classId: filters.classId,
      structureId: filters.structureId,
      status: filters.status && filters.status !== 'all' ? filters.status : undefined,
      search: filters.search || undefined,
    },
  });
  return data.items;
}

export async function fetchFeeSummary(): Promise<FeeSummaryPayload> {
  const { data } = await http.get<FeeSummaryPayload>('/fees/summary');
  return data;
}

export async function createFeeStructure(input: FeeStructureInput): Promise<FeeStructure> {
  const { data } = await http.post<{ structure: FeeStructure }>('/fees/structures', input);
  return data.structure;
}

export async function updateFeeStructure(
  id: string,
  input: Partial<FeeStructureInput> & { active?: boolean },
): Promise<FeeStructure> {
  const { data } = await http.patch<{ structure: FeeStructure }>(`/fees/structures/${id}`, input);
  return data.structure;
}

export async function deleteFeeStructure(id: string): Promise<{ id: string }> {
  await http.delete(`/fees/structures/${id}`);
  return { id };
}

export async function recordPayment(input: {
  paymentId: string;
  amount: number;
  method: 'cash' | 'card' | 'bank' | 'upi';
  reference?: string;
  paidOn?: string;
  note?: string;
}): Promise<InvoiceRow> {
  const { data } = await http.post<{ invoice: InvoiceRow }>(`/fees/payments/${input.paymentId}/receipts`, {
    amount: input.amount,
    method: input.method,
    reference: input.reference ?? '',
    paidOn: input.paidOn ?? new Date().toISOString().slice(0, 10),
    note: input.note ?? '',
  });
  return data.invoice;
}

export async function undoLastReceipt(paymentId: string): Promise<InvoiceRow> {
  const { data } = await http.delete<{ invoice: InvoiceRow }>(`/fees/payments/${paymentId}/receipts/last`);
  return data.invoice;
}

export function invoicePdfUrl(paymentId: string): string {
  return `/api/fees/invoices/${paymentId}/pdf`;
}

export function receiptPdfUrl(paymentId: string): string {
  return `/api/fees/payments/${paymentId}/receipt.pdf`;
}

// ---------------------------------------------------------------------------- hooks

export function useFeeStructures() {
  return useQuery({ queryKey: feeKeys.structures(), queryFn: fetchFeeStructures });
}

export function useFeePayments(filters: FeeFilters = {}) {
  return useQuery({ queryKey: feeKeys.payments(filters), queryFn: () => fetchFeePayments(filters) });
}

export function useInvoices(filters: FeeFilters = {}) {
  return useQuery({ queryKey: feeKeys.payments(filters), queryFn: () => fetchFeePayments(filters) });
}

export function useFeeSummary() {
  return useQuery({ queryKey: feeKeys.summary(), queryFn: fetchFeeSummary });
}

export function useCreateFeeStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFeeStructure,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateFeeStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<FeeStructureInput> & { active?: boolean } }) =>
      updateFeeStructure(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeKeys.all }),
  });
}

export function useDeleteFeeStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFeeStructure,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeKeys.all }),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feeKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}

export function useUndoReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: undoLastReceipt,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeKeys.all }),
  });
}
