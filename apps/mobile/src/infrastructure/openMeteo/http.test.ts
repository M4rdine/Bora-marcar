import { err, ok } from '@/domain';

import { fetchJson, type FetchLike } from './http';

const respond =
  (status: number, body: unknown): FetchLike =>
  async () => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const hang: FetchLike = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  });

describe('fetchJson', () => {
  it('devolve o JSON em caso de sucesso', async () => {
    expect(await fetchJson(respond(200, { a: 1 }), 'https://x')).toEqual(ok({ a: 1 }));
  });

  it('status HTTP fora de 2xx vira erro http com o status', async () => {
    expect(await fetchJson(respond(503, {}), 'https://x')).toEqual(
      err({ code: 'http', status: 503, message: 'HTTP 503' }),
    );
  });

  it('exceção do fetch vira erro network', async () => {
    const failing: FetchLike = async () => {
      throw new Error('offline');
    };
    expect(await fetchJson(failing, 'https://x')).toEqual(
      err({ code: 'network', message: 'offline' }),
    );
  });

  it('JSON inválido vira erro schema', async () => {
    const badJson: FetchLike = async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad');
      },
    });
    expect(await fetchJson(badJson, 'https://x')).toEqual(err({ code: 'schema', message: 'bad' }));
  });

  it('estoura o timeout e devolve erro timeout', async () => {
    expect(await fetchJson(hang, 'https://x', { timeoutMs: 5 })).toEqual(
      err({ code: 'timeout', message: 'Tempo esgotado após 5 ms' }),
    );
  });

  it('cancelamento externo vira erro network', async () => {
    const controller = new AbortController();
    const pending = fetchJson(hang, 'https://x', { signal: controller.signal, timeoutMs: 1000 });
    controller.abort();
    expect(await pending).toEqual(err({ code: 'network', message: 'aborted' }));
  });
});
