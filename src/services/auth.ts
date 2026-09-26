import type { User } from '@/types';
import { http, refreshAccessToken } from './http';
import type { Session } from '@/features/auth/session';

/** Auth + first-run setup endpoints. No demo shortcuts: every session comes from credentials. */

export interface SetupInput {
  institutionName: string;
  institutionType: 'school' | 'college' | 'university';
  address: string;
  phone: string;
  email: string;
  academicYearStart: string;
  academicYearEnd: string;
  currency: string;
  timezone: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export async function fetchSetupStatus(): Promise<{ needsSetup: boolean }> {
  const { data } = await http.get<{ needsSetup: boolean }>('/setup/status');
  return data;
}

export async function initializeSetup(input: SetupInput): Promise<Session> {
  const { data } = await http.post<{ user: User; accessToken: string }>('/setup/initialize', input);
  return { user: data.user, accessToken: data.accessToken };
}

export async function login(email: string, password: string): Promise<Session> {
  const { data } = await http.post<{ user: User; accessToken: string }>('/auth/login', { email, password });
  return { user: data.user, accessToken: data.accessToken };
}

export async function logoutRequest(): Promise<void> {
  await http.post('/auth/logout');
}

export async function fetchMe(): Promise<User> {
  const { data } = await http.get<{ user: User }>('/auth/me');
  return data.user;
}

/** Reload-safe bootstrap: a valid refresh cookie restores the session, otherwise null. */
export async function restoreSession(): Promise<Session | null> {
  const accessToken = await refreshAccessToken();
  if (!accessToken) return null;
  const user = await fetchMe();
  return { user, accessToken };
}

export async function requestPasswordReset(email: string): Promise<void> {
  await http.post('/auth/forgot-password', { email });
}

export async function resetPassword(input: { token: string; password: string }): Promise<void> {
  await http.post('/auth/reset-password', input);
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
