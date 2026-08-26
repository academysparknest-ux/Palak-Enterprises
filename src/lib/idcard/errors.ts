import { AppError, type AppErrorCode } from './types';

// Classifies whatever comes back from Supabase into one of our AppErrorCode
// buckets. Deliberately conservative: a bare 401 is AUTH_REQUIRED, not a
// clock-skew diagnosis — we only ever report clock issues if the server
// tells us explicitly (PGRST303 with an "issued at future" message).
export function classifySupabaseError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  const anyErr = err as { status?: number; statusCode?: number; code?: string; message?: string; error?: string } | undefined;
  const status = anyErr?.status ?? anyErr?.statusCode;
  const code = anyErr?.code;
  const message = anyErr?.message || anyErr?.error || (typeof err === 'string' ? err : 'Unknown error');

  if (status === 401 || code === 'PGRST301' || /jwt expired|invalid claim|unauthorized|not authenticated|active login required/i.test(message)) {
    return new AppError('AUTH_REQUIRED', 'Your session has expired. Please sign in again.', err);
  }

  if (status === 403 || code === '42501' || /permission denied|row-level security|forbidden/i.test(message)) {
    return new AppError('ACCESS_DENIED', 'You do not have permission to access ID card projects.', err);
  }

  if (code === 'PGRST303' && /issued at future/i.test(message)) {
    return new AppError(
      'AUTH_REQUIRED',
      'Your session token has a timing issue. Please sign out, sign back in, and check your device clock.',
      err
    );
  }

  if (code === 'PGRST116' || status === 404) {
    return new AppError('NOT_FOUND', 'The requested record was not found.', err);
  }

  if (code?.startsWith('23')) {
    // Postgres constraint violation class (unique, fk, not-null, check)
    return new AppError('VALIDATION_ERROR', message, err);
  }

  if (
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    /network|failed to fetch|timeout|timed out|abort/i.test(message)
  ) {
    return new AppError('NETWORK_ERROR', 'Unable to connect to the server. Please check your connection and try again.', err);
  }

  if (/storage/i.test(message)) {
    return new AppError('STORAGE_ERROR', message, err);
  }

  if ((status && status >= 500) || code?.startsWith('PGRST') || code?.startsWith('42')) {
    return new AppError('DATABASE_ERROR', 'Unable to load ID card projects. Please try again.', err);
  }

  return new AppError('UNKNOWN_ERROR', message, err);
}

export function errorCodeToUserMessage(code: AppErrorCode): string {
  switch (code) {
    case 'AUTH_REQUIRED':
      return 'Your session has expired. Please sign in again.';
    case 'ACCESS_DENIED':
      return 'You do not have permission to access ID card projects.';
    case 'VALIDATION_ERROR':
      return 'Some of the data provided is invalid.';
    case 'NOT_FOUND':
      return 'The requested record was not found.';
    case 'DATABASE_ERROR':
      return 'Unable to load ID card projects. Please try again.';
    case 'STORAGE_ERROR':
      return 'File upload/download failed. Please try again.';
    case 'NETWORK_ERROR':
      return 'Unable to connect to the server. Please check your connection and try again.';
    default:
      return 'Unable to load ID card projects. Please try again.';
  }
}
