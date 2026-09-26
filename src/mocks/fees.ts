import type { FeePayment, FeeStructure } from '@/types';
import { dateOffset } from '@/lib/utils';
import { classes } from './classes';
import { keyRandom } from './seed';

/**
 * Fee structure per class + one payment record per student per structure.
 * Statuses are deterministic: tuition is mostly settled, transport is mixed and
 * annual charges are usually pending — which makes the fee dashboard interesting.
 */

function buildStructures(): FeeStructure[] {
  const structures: FeeStructure[] = [];

  classes.forEach((classRoom, index) => {
    structures.push(
      {
        id: `f-tuition-${classRoom.id}`,
        classId: classRoom.id,
        title: 'Tuition Fee (Monthly)',
        amount: 4500 + index * 500,
        frequency: 'monthly',
        dueDate: dateOffset(7),
      },
      {
        id: `f-transport-${classRoom.id}`,
        classId: classRoom.id,
        title: 'Transport Fee (Monthly)',
        amount: 1200,
        frequency: 'monthly',
        dueDate: dateOffset(7),
      },
      {
        id: `f-annual-${classRoom.id}`,
        classId: classRoom.id,
        title: 'Annual Charges',
        amount: 6000,
        frequency: 'yearly',
        dueDate: dateOffset(-12),
      },
    );
  });

  return structures;
}

export const feeStructures: FeeStructure[] = buildStructures();

function buildPayments(): FeePayment[] {
  const payments: FeePayment[] = [];
  let invoiceSeq = 1001;

  feeStructures.forEach((structure) => {
    const classRoom = classes.find((item) => item.id === structure.classId);
    if (!classRoom) return;

    classRoom.studentIds.forEach((studentId, studentIndex) => {
      const roll = keyRandom(`fee|${studentId}|${structure.id}`);
      const isTransport = structure.title.startsWith('Transport');
      const isAnnual = structure.title.startsWith('Annual');

      let status: FeePayment['status'] = 'paid';
      if (isTransport) status = roll > 0.55 ? 'paid' : roll > 0.3 ? 'partial' : 'unpaid';
      else if (isAnnual) status = roll > 0.62 ? 'paid' : 'unpaid';
      else status = (studentIndex + Math.round(roll * 10)) % 7 === 0 ? 'unpaid' : 'paid';

      const paidAmount =
        status === 'paid'
          ? structure.amount
          : status === 'partial'
            ? Math.round(structure.amount / 2)
            : 0;

      payments.push({
        id: `pay-${structure.id}-${studentId}`,
        invoiceNo: `INV-${invoiceSeq++}`,
        studentId,
        structureId: structure.id,
        amount: structure.amount,
        paidAmount,
        status,
        dueDate: structure.dueDate,
        paidOn: status === 'unpaid' ? null : dateOffset(-(3 + Math.round(roll * 20))),
        method: status === 'unpaid' ? undefined : roll > 0.6 ? 'bank' : 'cash',
      });
    });
  });

  return payments;
}

export const feePayments: FeePayment[] = buildPayments();
