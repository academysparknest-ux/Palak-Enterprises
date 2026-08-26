import { AppError, type AppErrorCode } from './types';

// Classifies whatever comes back from Supabase into one of our AppErrorCode
// buckets. Deliberately conservative: a bare 401 is AUTH_REQUIRED, not a
// clock-skew diagnosis — we only ever report clock issues if the server
// tells us explicitly (PGRST303 with an "issued at future" message).
export function classifySupabaseError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  const anyErr = err as { status?: number; code?: string; message?: string } | undefined;
  const status = anyErr?.status;
  const code = anyErr?.code;
  const message = anyErr?.message ?? 'Unknown error';

  if (status === 401) {
    return new AppError('AUTH_REQUIRED', 'Your session is not valid. Please sign in again.', err);
  }

  if (status === 403) {
    return new AppError('ACCESS_DENIED', 'You do not have permission to do this.', err);
  }

  if (code === 'PGRST303' && /issued at future/i.test(message)) {
    // This is the one legitimate case where a clock-skew message is warranted —
    // and even then, it's PostgREST reporting it, not us guessing.
    return new AppError(
      'AUTH_REQUIRED',
      'Your session token has a timing issue. Please sign out, sign back in, and check your device clock.',
      err
    );
  }

  if (code === 'PGRST116') {
    return new AppError('NOT_FOUND', 'The requested record was not found.', err);
  }

  if (code?.startsWith('23')) {
    // Postgres constraint violation class (unique, fk, not-null, check)
    return new AppError('VALIDATION_ERROR', message, err);
  }

  if (code === 'ECONNABORTED' || message.toLowerCase().includes('network')) {
    return new AppError('NETWORK_ERROR', 'Network request failed. Check your connection.', err);
  }

  if (message.toLowerCase().includes('storage')) {
    return new AppError('STORAGE_ERROR', message, err);
  }

  if (status && status >= 500) {
    return new AppError('DATABASE_ERROR', 'Something went wrong on the server.', err);
  }

  return new AppError('UNKNOWN_ERROR', message, err);
}

export function errorCodeToUserMessage(code: AppErrorCode): string {
  switch (code) {
    case 'AUTH_REQUIRED':
      return 'Please sign in to continue.';
    case 'ACCESS_DENIED':
      return "You don't have access to this.";
    case 'VALIDATION_ERROR':
      return 'Some of the data provided is invalid.';
    case 'NOT_FOUND':
      return 'Not found.';
    case 'DATABASE_ERROR':
      return 'A database error occurred. Please try again.';
    case 'STORAGE_ERROR':
      return 'File upload/download failed. Please try again.';
    case 'NETWORK_ERROR':
      return 'Network error. Check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
