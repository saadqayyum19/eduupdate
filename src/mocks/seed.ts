import { toISODate } from '@/lib/utils';

/**
 * Deterministic pseudo-random helpers.
 * Mocks must look "random" but stay identical between reloads, so grades,
 * attendance and fee statuses never jump around while you click through the UI.
 */
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable hash for a string (used to seed per-student/per-date values). */
export function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic 0..1 value for any string key. */
export function keyRandom(key: string): number {
  return mulberry32(hash(key))();
}

export function keyInt(key: string, min: number, max: number): number {
  return min + Math.floor(keyRandom(key) * (max - min + 1));
}

export function pick<T>(items: readonly T[], key: string): T {
  return items[keyInt(key, 0, items.length - 1)];
}

/**
 * The `count` most recent school days (Mon–Sat), oldest first.
 * Includes today when today is not a Sunday, so the daily attendance roster
 * and the monthly view both have data on first load.
 */
export function recentSchoolDays(count = 6): string[] {
  const days: string[] = [];
  const cursor = new Date();
  while (days.length < count) {
    if (cursor.getDay() !== 0) days.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return days.reverse();
}

/** The school week (Mon–Sat) that the sample timetable + reports use. */
export const SAMPLE_WEEK = recentSchoolDays(6);

export const AVATAR_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#db2777',
  '#4f46e5',
  '#0d9488',
  '#ca8a04',
  '#9333ea',
  '#0284c7',
];
