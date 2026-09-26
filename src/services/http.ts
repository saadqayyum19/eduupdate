import axios from 'axios';

/**
 * Axios instance for the future Node + Express backend.
 * The UI currently talks to `src/services/api/*` (mock), but everything is already
 * wired here: base URL, JSON headers, JWT bearer token and error normalisation.
 */
export const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

let tokenProvider: () => string | null = () => null;

/** The auth slice registers its token getter so we don't import the store here (no cycles). */
export function setTokenProvider(provider: () => string | null) {
  tokenProvider = provider;
}

http.interceptors.request.use((config) => {
  const token = tokenProvider();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { message?: string } | undefined)?.message ??
        error.message ??
        'Something went wrong. Please try again.';
      return Promise.reject(new Error(message));
    }
    return Promise.reject(error instanceof Error ? error : new Error('Unknown error'));
  },
);
