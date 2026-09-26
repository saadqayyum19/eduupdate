import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role, User } from '@/types';
import { AVATAR_COLORS, hash } from '@/mocks/seed';
import { getDb, mockDelay, nextId } from '../mockDb';
import { emailInUse, purgeUserReferences, reconcileClass } from '../cascade';

export const userKeys = {
  all: ['users'] as const,
  list: (filters?: UserFilters) => [...userKeys.all, 'list', filters ?? {}] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

export interface UserFilters {
  role?: Role | 'all';
  search?: string;
}

export interface UserInput {
  name: string;
  email: string;
  phone?: string;
  role: Role;
  status?: User['status'];
  designation?: string;
  classIds?: string[];
  subjectIds?: string[];
  classId?: string;
  rollNo?: string;
  registrationNo?: string;
  fatherName?: string;
  cnic?: string;
  bform?: string;
  dob?: string;
  address?: string;
  photoUrl?: string;
  parentIds?: string[];
  childIds?: string[];
}

export async function fetchUsers(filters: UserFilters = {}): Promise<User[]> {
  await mockDelay();
  const search = filters.search?.trim().toLowerCase() ?? '';
  return getDb()
    .users.filter((user) => (filters.role && filters.role !== 'all' ? user.role === filters.role : true))
    .filter((user) =>
      search
        ? user.name.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search) ||
          (user.rollNo ?? '').toLowerCase().includes(search)
        : true,
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchUser(id: string): Promise<User> {
  await mockDelay();
  const user = getDb().users.find((item) => item.id === id);
  if (!user) throw new Error('That user could not be found.');
  return user;
}

export async function createUser(input: UserInput): Promise<User> {
  await mockDelay();
  if (emailInUse(input.email)) {
    throw new Error('That email address is already used by another account.');
  }

  const users = getDb().users;
  const user: User = {
    id: nextId('u'),
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone,
    role: input.role,
    status: input.status ?? 'active',
    avatarColor: AVATAR_COLORS[hash(input.email) % AVATAR_COLORS.length],
    joinedAt: new Date().toISOString().slice(0, 10),
    designation: input.designation,
    classIds: input.classIds,
    classId: input.classId,
    rollNo: input.rollNo,
    registrationNo: input.registrationNo,
    fatherName: input.fatherName,
    cnic: input.cnic,
    bform: input.bform,
    dob: input.dob,
    address: input.address,
    photoUrl: input.photoUrl,
    parentIds: input.parentIds ?? [],
    childIds: input.childIds ?? [],
  };
  users.push(user);

  // Keep the class / user graph symmetrical (a student joins its class, a child links to a parent).
  if (user.role === 'student' && user.classId) {
    const classRoom = getDb().classes.find((item) => item.id === user.classId);
    if (classRoom && !classRoom.studentIds.includes(user.id)) {
      classRoom.studentIds = [...classRoom.studentIds, user.id];
      reconcileClass(classRoom.id);
    }
  }
  if (user.role === 'parent') {
    user.childIds?.forEach((childId) => {
      const child = getDb().users.find((item) => item.id === childId);
      if (child) child.parentIds = [...new Set([...(child.parentIds ?? []), user.id])];
    });
  }

  return user;
}

/** Fields an update is allowed to touch. Anything else is ignored. */
const MUTABLE_USER_FIELDS = [
  'name',
  'email',
  'phone',
  'role',
  'status',
  'designation',
  'classIds',
  'subjectIds',
  'classId',
  'rollNo',
  'registrationNo',
  'fatherName',
  'cnic',
  'bform',
  'dob',
  'address',
  'photoUrl',
  'parentIds',
  'childIds',
  'avatarColor',
] as const satisfies readonly (keyof UserInput | keyof User)[];

export async function updateUser(id: string, input: Partial<UserInput>): Promise<User> {
  await mockDelay();
  const db = getDb();
  const index = db.users.findIndex((item) => item.id === id);
  if (index === -1) throw new Error('That user could not be found.');

  if (input.email && emailInUse(input.email, id)) {
    throw new Error('That email address is already used by another account.');
  }

  const previous = db.users[index];
  const patch: Partial<User> = {};
  MUTABLE_USER_FIELDS.forEach((field) => {
    if (field in input) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (patch as any)[field] = (input as any)[field];
    }
  });

  const next: User = { ...previous, ...patch };
  if (patch.name) next.name = patch.name.trim();
  if (patch.email) next.email = patch.email.trim();
  db.users[index] = next;

  // A student moved to another class must leave the one they were in before.
  if (next.role === 'student' && next.classId) {
    const classRoom = db.classes.find((item) => item.id === next.classId);
    if (classRoom && !classRoom.studentIds.includes(id)) {
      classRoom.studentIds = [...classRoom.studentIds, id];
    }
    reconcileClass(next.classId);
  } else if (previous.classId && previous.classId !== next.classId) {
    const oldRoom = db.classes.find((item) => item.id === previous.classId);
    if (oldRoom) oldRoom.studentIds = oldRoom.studentIds.filter((studentId) => studentId !== id);
    reconcileClass(previous.classId);
  }

  // Re-sync parent ↔ child links from the edited account.
  if (next.role === 'parent') {
    db.users.forEach((user) => {
      const shouldLink = (next.childIds ?? []).includes(user.id);
      const linked = (user.parentIds ?? []).includes(id);
      if (shouldLink && !linked) user.parentIds = [...(user.parentIds ?? []), id];
      if (!shouldLink && linked) user.parentIds = (user.parentIds ?? []).filter((parentId) => parentId !== id);
    });
  }

  // A teacher's class list changed → re-reconcile the classes involved.
  if (next.role === 'teacher' || next.role === 'teacher_incharge') {
    const touched = new Set([...(previous.classIds ?? []), ...(next.classIds ?? [])]);
    touched.forEach((classId) => reconcileClass(classId));
  }

  return db.users[index];
}

export async function deleteUser(id: string): Promise<{ id: string }> {
  await mockDelay();
  const db = getDb();

  db.users = db.users.filter((item) => item.id !== id);
  purgeUserReferences(id);

  return { id };
}

// ---------------------------------------------------------------------------- hooks

export function useUsers(filters: UserFilters = {}, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => fetchUsers(filters),
    enabled: options?.enabled,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ''),
    queryFn: () => fetchUser(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<UserInput> }) => updateUser(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['marks'] });
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      queryClient.invalidateQueries({ queryKey: ['fees'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
