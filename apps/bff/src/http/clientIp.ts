import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';

const UNKNOWN = 'unknown';

/**
 * IP do cliente: atrás do nginx (`TRUST_PROXY=true`) é `X-Real-IP` (o nginx grava
 * `$remote_addr`, que o cliente não controla); senão, a conexão.
 *
 * Não usamos `X-Forwarded-For`: o nginx (Task 12) usa `$proxy_add_x_forwarded_for`, que só
 * anexa o endereço real ao que já veio no cabeçalho — um cliente pode mandar
 * `X-Forwarded-For: 1.2.3.4` e "furar" o rate limit por IP se confiarmos na primeira entrada.
 */
export function clientIp(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    const real = c.req.header('x-real-ip')?.trim();
    if (real) return real;
  }
  try {
    return getConnInfo(c).remote.address ?? UNKNOWN;
  } catch {
    return UNKNOWN; // `app.request()` nos testes não tem socket
  }
}
