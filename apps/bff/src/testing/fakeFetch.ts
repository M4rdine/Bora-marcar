import type { FetchLike } from '../upstream/openMeteo';

type Reply = { status?: number; body?: unknown; delayMs?: number; throws?: Error };

/** fetch falso: devolve a resposta programada e grava as URLs chamadas. */
export function fakeFetch(reply: Reply | ((url: string) => Reply)) {
  const calls: string[] = [];
  const fetchFn: FetchLike = async (url, init) => {
    calls.push(url);
    const r = typeof reply === 'function' ? reply(url) : reply;
    if (r.throws) throw r.throws;
    if (r.delayMs) {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, r.delayMs);
        init.signal.addEventListener('abort', () => {
          clearTimeout(t);
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    }
    const status = r.status ?? 200;
    return { ok: status >= 200 && status < 300, status, json: async () => r.body };
  };
  return { fetchFn, calls };
}
