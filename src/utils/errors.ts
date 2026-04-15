/**
 * Custom Error Types and Structured JSON Logging
 */

export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  OAUTH_FAILED = 'OAUTH_FAILED',
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: any,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

/**
 * Structured Logging Helper
 */
export function log(
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: Record<string, any>,
) {
  const timestamp = new Date().toISOString();
  const output = JSON.stringify({
    timestamp,
    level,
    message,
    ...context,
  });

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const Errors = {
  Unauthorized: (msg = 'Unauthorized access') =>
    new AppError(ErrorCode.UNAUTHORIZED, msg, undefined, 401),
  Forbidden: (msg = 'Forbidden') => new AppError(ErrorCode.FORBIDDEN, msg, undefined, 403),
  NotFound: (msg = 'Resource not found') => new AppError(ErrorCode.NOT_FOUND, msg, undefined, 404),
  BadRequest: (msg = 'Bad Request', details?: any) =>
    new AppError(ErrorCode.BAD_REQUEST, msg, details, 400),
  InternalError: (msg = 'Internal server error') =>
    new AppError(ErrorCode.INTERNAL_ERROR, msg, undefined, 500),
  RateLimited: (msg = 'Too many requests') =>
    new AppError(ErrorCode.RATE_LIMITED, msg, undefined, 429),
  OAuthFailed: (msg = 'OAuth flow failed') =>
    new AppError(ErrorCode.OAUTH_FAILED, msg, undefined, 400),
};
