/**
 * Operational error type. Every one of these is turned into an RFC 7807
 * `application/problem+json` response by the central error handler.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail?: string;
  readonly code?: string;
  readonly errors?: Record<string, string[]>;

  constructor(options: {
    status: number;
    title: string;
    detail?: string;
    code?: string;
    errors?: Record<string, string[]>;
  }) {
    super(options.detail ?? options.title);
    this.name = 'ApiError';
    this.status = options.status;
    this.title = options.title;
    this.detail = options.detail;
    this.code = options.code;
    this.errors = options.errors;
  }

  static badRequest(detail: string, code = 'bad_request'): ApiError {
    return new ApiError({ status: 400, title: 'Bad request', detail, code });
  }

  static unauthorized(detail = 'Your session has ended. Please sign in again.'): ApiError {
    return new ApiError({ status: 401, title: 'Unauthorized', detail, code: 'unauthorized' });
  }

  static forbidden(detail = 'You do not have permission to do that.'): ApiError {
    return new ApiError({ status: 403, title: 'Forbidden', detail, code: 'forbidden' });
  }

  static notFound(detail = 'That record could not be found.'): ApiError {
    return new ApiError({ status: 404, title: 'Not found', detail, code: 'not_found' });
  }

  static conflict(detail: string, code = 'conflict'): ApiError {
    return new ApiError({ status: 409, title: 'Conflict', detail, code });
  }

  static tooManyRequests(detail = 'Too many requests. Please slow down.'): ApiError {
    return new ApiError({ status: 429, title: 'Too many requests', detail, code: 'rate_limited' });
  }

  static validation(errors: Record<string, string[]>, detail = 'Please check the highlighted fields.'): ApiError {
    return new ApiError({ status: 422, title: 'Validation failed', detail, code: 'validation_error', errors });
  }

  static locked(detail: string): ApiError {
    return new ApiError({ status: 423, title: 'Account locked', detail, code: 'account_locked' });
  }
}
