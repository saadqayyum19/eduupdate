import { createDatabase, type MockDatabase } from '@/mocks';
import { sleep, uid } from '@/lib/utils';

/**
 * Tiny in-memory "backend" so the UI is fully interactive before the real API exists.
 *
 * Everything is synchronous in-memory work wrapped in a fake network delay, which means
 * screens still show real loading/skeleton/error states. When the Node + Express +
 * MongoDB API lands, only the functions in `src/services/api/*` change — no page needs
 * to be touched.
 */

let db: MockDatabase = createDatabase();

/** Milliseconds of simulated latency. Overridable from the console while developing. */
let latencyMs = 350;

export function setMockLatency(ms: number) {
  latencyMs = Math.max(0, ms);
}

export function getDb(): MockDatabase {
  return db;
}

/** Wipe local changes and reload the seed data (used by the reset action in the topbar). */
export function resetDb() {
  db = createDatabase();
}

export async function mockDelay(ms = latencyMs) {
  await sleep(ms);
}

/** Fake server-side "not found" so error states can be seen in the UI. */
export async function mockError(message: string, ms = latencyMs): Promise<never> {
  await sleep(ms);
  throw new Error(message);
}

export function nextId(prefix: string) {
  return uid(prefix);
}
