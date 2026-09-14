import { err, isErr, isOk, ok } from './result';

describe('Result', () => {
  it('ok carrega o valor e é reconhecido por isOk', () => {
    const r = ok(42);
    expect(r).toEqual({ ok: true, value: 42 });
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
  });

  it('err carrega o erro e é reconhecido por isErr', () => {
    const r = err({ code: 'boom' as const });
    expect(r).toEqual({ ok: false, error: { code: 'boom' } });
    expect(isErr(r)).toBe(true);
    expect(isOk(r)).toBe(false);
  });
});
