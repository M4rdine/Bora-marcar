import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';

const UNKNOWN = 'unknown';

/** IP do cliente: atrás do nginx (`TRUST_PROXY=true`) é o primeiro X-Forwarded-For; senão, a conexão. */
export function clientIp(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = c.req.header('x-forwarded-for');
    const first = forwarded?.split(',')[0]?.trim();
    if (first) return first;
  }
  try {
    return getConnInfo(c).remote.address ?? UNKNOWN;
  } catch {
    return UNKNOWN; // `app.request()` nos testes não tem socket
  }
}
