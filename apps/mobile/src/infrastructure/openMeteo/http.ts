import type { ProviderError } from '@/application/ports';
import { err, ok, type Result } from '@/domain';

export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export const DEFAULT_TIMEOUT_MS = 8000;

type Options = { readonly signal?: AbortSignal; readonly timeoutMs?: number };

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export async function fetchJson(
  fetchFn: FetchLike,
  url: string,
  opts: Options = {},
): Promise<Result<unknown, ProviderError>> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const state = { timedOut: false };
  const timer = setTimeout(() => {
    state.timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetchFn(url, { signal: controller.signal });
    if (!response.ok)
      return err({ code: 'http', status: response.status, message: `HTTP ${response.status}` });
    try {
      return ok(await response.json());
    } catch (e) {
      return err({ code: 'schema', message: messageOf(e) });
    }
  } catch (e) {
    return state.timedOut
      ? err({ code: 'timeout', message: `Tempo esgotado após ${timeoutMs} ms` })
      : err({ code: 'network', message: messageOf(e) });
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}
