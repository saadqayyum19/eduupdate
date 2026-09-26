import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Role, User } from '@/types';
import { DEMO_PASSWORD, ROLE_DEMO_USER } from '@/mocks/users';
import { getDb } from '@/services/mockDb';

/**
 * Mock authentication.
 *
 * This is the only place that stands in for the real backend while the API is being built.
 * It reads the live mock database (not the frozen seed array) so accounts created at runtime
 * can sign in, and it honours the `status` field so deactivated accounts are rejected.
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  status: 'idle' | 'loading' | 'error';
  error: string | null;
  /** Dev-only: shows the role switcher in the topbar. Never enabled in production builds. */
  roleSwitcherEnabled: boolean;
}

function findUser(id: string): User | null {
  return getDb().users.find((user) => user.id === id) ?? null;
}

const initialState: AuthState = {
  // Starts signed out — the login screen is the real entry point.
  user: null,
  token: null,
  isAuthenticated: false,
  status: 'idle',
  error: null,
  roleSwitcherEnabled: import.meta.env.DEV,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.status = 'loading';
      state.error = null;
    },
    loginSuccess(state, action: PayloadAction<{ user: User; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.status = 'idle';
      state.error = null;
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.status = 'idle';
      state.error = null;
    },
    /** Dev role switcher: sign in as that role's demo account without a password. */
    switchRole(state, action: PayloadAction<Role>) {
      const user = findUser(ROLE_DEMO_USER[action.payload]);
      if (user) {
        state.user = user;
        state.token = `mock.jwt.${user.id}`;
        state.isAuthenticated = true;
        state.status = 'idle';
        state.error = null;
      }
    },
    updateProfile(state, action: PayloadAction<Partial<User>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        const stored = getDb().users.find((user) => user.id === state.user?.id);
        if (stored) Object.assign(stored, action.payload);
      }
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  switchRole,
  updateProfile,
} = authSlice.actions;

export const authReducer = authSlice.reducer;

export type LoginResult =
  | { ok: true; user: User; token: string }
  | { ok: false; reason: 'unknown-email' | 'bad-password' | 'inactive' };

/**
 * Mock credential check.
 *
 * Accepts any account in the live mock database that is `active`, with the shared demo
 * password. Returns a discriminated result so the UI can show a specific message.
 */
export function authenticate(email: string, password: string): LoginResult {
  const user = getDb().users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) return { ok: false, reason: 'unknown-email' };
  if (password !== DEMO_PASSWORD) return { ok: false, reason: 'bad-password' };
  if (user.status !== 'active') return { ok: false, reason: 'inactive' };
  return { ok: true, user, token: `mock.jwt.${user.id}` };
}

/** Human-readable message for a failed login attempt. */
export function loginErrorMessage(reason: 'unknown-email' | 'bad-password' | 'inactive'): string {
  switch (reason) {
    case 'unknown-email':
      return 'No account exists for that email address.';
    case 'bad-password':
      return 'That password is not correct. Use the demo password shown below.';
    case 'inactive':
      return 'That account has been deactivated. Ask an administrator to reactivate it.';
  }
}
