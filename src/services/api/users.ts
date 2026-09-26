import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role, User } from '@/types';
import { http } from '../http';

export const userKeys = {
  all: ['users'] as const,
  list: (filters?: UserFilters) => [...userKeys.all, 'list', filters ?? {}] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};

export interface UserFilters {
  role?: Role | 'all';
  status?: User['status'] | 'all';
  classId?: string;
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
  classId?: string | null;
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

export interface CreateAccountInput extends UserInput {
  /** Administrator-typed initial password. When omitted the API generates one. */
  password?: string;
  /** Also email the credentials to the new account. */
  sendInvite?: boolean;
}

export interface CreateAccountResult {
  user: User;
  temporaryPassword?: string;
  invited: boolean;
}

function toParams(filters: UserFilters) {
  return {
    pageSize: 200,
    role: filters.role && filters.role !== 'all' ? filters.role : undefined,
    status: filters.status && filters.status !== 'all' ? filters.status : undefined,
    classId: filters.classId,
    search: filters.search || undefined,
  };
}

export async function fetchUsers(filters: UserFilters = {}): Promise<User[]> {
  const { data } = await http.get<{ items: User[] }>('/users', { params: toParams(filters) });
  return data.items;
}

export async function fetchUser(id: string): Promise<User> {
  const { data } = await http.get<{ user: User }>(`/users/${id}`);
  return data.user;
}

/** Creates an account. Always returns the record the administrator just created. */
export async function createUser(input: CreateAccountInput): Promise<CreateAccountResult> {
  const { data } = await http.post<CreateAccountResult>('/users', input);
  return data;
}

export async function updateUser(id: string, input: Partial<CreateAccountInput>): Promise<User> {
  const { data } = await http.patch<{ user: User }>(`/users/${id}`, input);
  return data.user;
}

export async function deleteUser(id: string): Promise<{ id: string }> {
  await http.delete(`/users/${id}`);
  return { id };
}

export async function updateMyProfile(input: {
  name?: string;
  phone?: string;
  address?: string;
  photoUrl?: string;
}): Promise<User> {
  const { data } = await http.patch<{ user: User }>('/users/me', input);
  return data.user;
}

export async function changeMyPassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  await http.post('/users/me/password', input);
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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateAccountInput> }) => updateUser(id, input),
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

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useChangeMyPassword() {
  return useMutation({ mutationFn: changeMyPassword });
}
