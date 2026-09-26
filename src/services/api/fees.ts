import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FeePayment, FeeStructure, FeeStatus } from '@/types';
import { getDb, mockDelay, nextId } from '../mockDb';
import { nextInvoiceNumber } from '../cascade';

export const feeKeys = {
  all: ['fees'] as const,
  structures: () => [...feeKeys.all, 'structures'] as const,
  payments: (filters?: FeeFilters) => [...feeKeys.all, 'payments', filters ?? {}] as const,
};

export interface FeeFilters {
  studentId?: string;
  classId?: string;
  status?: FeeStatus | 'all';
}

export interface FeeStructureInput {
  classId: string;
  title: string;
  amount: number;
  frequency: FeeStructure['frequency'];
  dueDate: string;
}

export async function fetchFeeStructures(): Promise<FeeStructure[]> {
  await mockDelay();
  return [...getDb().feeStructures];
}

export async function fetchFeePayments(filters: FeeFilters = {}): Promise<FeePayment[]> {
  await mockDelay();
  const db = getDb();
  const studentIdsOfClass = filters.classId
    ? db.users.filter((user) => user.classId === filters.classId).map((user) => user.id)
    : null;

  return db.feePayments
    .filter((payment) => (filters.studentId ? payment.studentId === filters.studentId : true))
    .filter((payment) => (studentIdsOfClass ? studentIdsOfClass.includes(payment.studentId) : true))
    .filter((payment) => (filters.status && filters.status !== 'all' ? payment.status === filters.status : true))
    .map((payment) => {
      const structure = db.feeStructures.find((item) => item.id === payment.structureId);
      return { ...payment, classId: structure?.classId } as FeePayment & { classId?: string };
    });
}

export async function createFeeStructure(input: FeeStructureInput): Promise<FeeStructure> {
  await mockDelay(350);
  const db = getDb();
  const structure: FeeStructure = { ...input, id: nextId('f') };
  db.feeStructures.push(structure);

  // Raise an invoice for every student in the class straight away.
  const students = db.users.filter((user) => user.classId === input.classId);
  students.forEach((student) => {
    db.feePayments.push({
      id: nextId('pay'),
      invoiceNo: nextInvoiceNumber(),
      studentId: student.id,
      structureId: structure.id,
      amount: structure.amount,
      paidAmount: 0,
      status: 'unpaid',
      dueDate: structure.dueDate,
      paidOn: null,
    });
  });

  return structure;
}

/** Mark an invoice paid (or unpaid) from the fees table. */
export async function setPaymentStatus(input: {
  paymentId: string;
  status: FeeStatus;
}): Promise<FeePayment> {
  await mockDelay(300);
  const payment = getDb().feePayments.find((item) => item.id === input.paymentId);
  if (!payment) throw new Error('That invoice could not be found.');
  payment.status = input.status;
  payment.paidAmount =
    input.status === 'paid' ? payment.amount : input.status === 'partial' ? Math.round(payment.amount / 2) : 0;
  payment.paidOn = input.status === 'unpaid' ? null : new Date().toISOString().slice(0, 10);
  payment.method = input.status === 'unpaid' ? undefined : (payment.method ?? 'cash');
  return payment;
}

// ---------------------------------------------------------------------------- hooks

export function useFeeStructures() {
  return useQuery({ queryKey: feeKeys.structures(), queryFn: fetchFeeStructures });
}

export function useFeePayments(filters: FeeFilters = {}) {
  return useQuery({ queryKey: feeKeys.payments(filters), queryFn: () => fetchFeePayments(filters) });
}

export function useCreateFeeStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFeeStructure,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeKeys.all }),
  });
}

export function useSetPaymentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setPaymentStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: feeKeys.all }),
  });
}
