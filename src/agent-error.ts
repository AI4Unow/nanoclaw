import {
  EXTERNAL_API_AUTH_ERROR_MESSAGE,
  EXTERNAL_API_UNAVAILABLE_MESSAGE,
} from './config.js';

export type ExternalApiFailureKind = 'none' | 'auth' | 'unavailable';

const AUTH_ERROR_PATTERNS = [
  /invalid api key/i,
  /authentication/i,
  /unauthori[sz]ed/i,
  /\b401\b/,
  /\b403\b/,
  /forbidden/i,
];

const UNAVAILABLE_ERROR_PATTERNS = [
  /upstream request timeout/i,
  /connection error/i,
  /\b504\b/,
  /\b503\b/,
  /\b502\b/,
  /\b429\b/,
  /timed?\s*out/i,
  /\betimedout\b/i,
  /\beconnreset\b/i,
  /\beconnrefused\b/i,
  /\benotfound\b/i,
  /network error/i,
  /service unavailable/i,
  /rate limit/i,
  /temporar(?:y|ily)\s+unavailable/i,
];

export function classifyExternalApiFailure(
  errorText?: string | null,
): ExternalApiFailureKind {
  if (!errorText) return 'none';

  if (AUTH_ERROR_PATTERNS.some((pattern) => pattern.test(errorText))) {
    return 'auth';
  }

  if (UNAVAILABLE_ERROR_PATTERNS.some((pattern) => pattern.test(errorText))) {
    return 'unavailable';
  }

  return 'none';
}

export function getExternalApiFailureMessage(
  errorText?: string | null,
): string | null {
  const kind = classifyExternalApiFailure(errorText);

  if (kind === 'auth') return EXTERNAL_API_AUTH_ERROR_MESSAGE;
  if (kind === 'unavailable') return EXTERNAL_API_UNAVAILABLE_MESSAGE;
  return null;
}
