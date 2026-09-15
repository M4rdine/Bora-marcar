import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type ErrorCode =
  'bad_request' | 'not_found' | 'rate_limited' | 'upstream_unavailable' | 'internal';

export class AppError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: ErrorCode,
    message: string,
    readonly headers: Readonly<Record<string, string>> = {},
  ) {
    super(message);
  }
}

export const errorBody = (code: ErrorCode, message: string) => ({ error: { code, message } });

export function errorResponse(c: Context, e: AppError): Response {
  return c.json(errorBody(e.code, e.message), e.status, e.headers);
}
