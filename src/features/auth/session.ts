import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import type { User } from '@/types';
import { setAccessToken } from '@/services/http';
import { loginSuccess, logout } from './authSlice';

export interface Session {
  user: User;
  accessToken: string;
}

/** Stores the access token in memory and marks the user as signed in. */
export function beginSession(dispatch: Dispatch<UnknownAction>, session: Session): void {
  setAccessToken(session.accessToken);
  dispatch(loginSuccess({ user: session.user, token: session.accessToken }));
}

/** Clears the in-memory token and the Redux session. */
export function endSession(dispatch: Dispatch<UnknownAction>): void {
  setAccessToken(null);
  dispatch(logout());
}
