/** Application error with an HTTP status and a machine-readable code. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string, code = 'ERROR') {
    super(message);
    this.status = status;
    this.code = code;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Bad request') {
    return new ApiError(400, message, 'BAD_REQUEST');
  }
  static unauthorized(message = 'Not authenticated') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'Not authorised') {
    return new ApiError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message, 'NOT_FOUND');
  }
  static conflict(message = 'Conflict') {
    return new ApiError(409, message, 'CONFLICT');
  }
  static internal(message = 'Internal server error') {
    return new ApiError(500, message, 'INTERNAL');
  }
}
