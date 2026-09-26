import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

/**
 * HTTP layer for the EduCore Lite API.
 *
 * - The access token lives in memory only (never localStorage) and is attached to every request.
 * - A rotating httpOnly refresh cookie keeps the session alive across reloads.
 * - A 401 triggers exactly one refresh; concurrent failures queue on the same promise and replay.
 * - Errors are normalised into `ApiError` (RFC 7807 problem+json → Error).
 */

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields?: Record<string, string[]>;

  constructor(message: string, status: number, code?: string, fields?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
}

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

/** Requests that must never be replayed, otherwise an expired cookie would loop forever. */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout', '/setup/initialize'];

export const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

/** Bare instance for the refresh handshake so it can never recurse through the interceptor. */
const bare = axios.create({ baseURL: BASE_URL, withCredentials: true, timeout: 30_000 });

let accessToken: string | null = null;
let expiredHandler: (() => void) | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Called when a session cannot be recovered — the app then signs the user out. */
export function onSessionExpired(handler: (() => void) | null): void {
  expiredHandler = handler;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const problem = (error.response?.data as ProblemDetails | undefined) ?? {};
    const status = error.response?.status ?? 0;
    const message =
      problem.detail ??
      problem.title ??
      (status === 0
        ? 'Cannot reach the server. Check your connection and try again.'
        : 'Something went wrong. Please try again.');
    return new ApiError(message, status, problem.code, problem.errors);
  }
  return new ApiError(error instanceof Error ? error.message : 'Something went wrong. Please try again.', 0);
}

/** Exchange the refresh cookie for a new access token. Concurrent callers share one request. */
export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = bare
      .post<{ accessToken: string }>('/auth/refresh')
      .then((response) => {
        accessToken = response.data.accessToken;
        return accessToken;
      })
      .catch(() => {
        accessToken = null;
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

interface RetryConfig extends AxiosRequestConfig {
  __retried?: boolean;
}

http.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) throw toApiError(error);

    const config = error.config as RetryConfig | undefined;
    const url = config?.url ?? '';
    const skippable = config?.__retried || NO_REFRESH_PATHS.some((path) => url.includes(path));

    if (error.response?.status === 401 && config && !skippable) {
      const token = await refreshAccessToken();
      if (token) {
        config.__retried = true;
        config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
        return http.request(config);
      }
      expiredHandler?.();
    }

    throw toApiError(error);
  },
);
