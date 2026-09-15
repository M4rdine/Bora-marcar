import { act, renderHook, waitFor } from '@testing-library/react-native';

import { ACTION_ERROR_CODES, isActionError, useActionRunner } from './actionRunner';

const NETWORK = 'Sem conexão. Tente de novo.';

const runRejecting = (reason: unknown) => {
  const hook = renderHook(() => useActionRunner());
  act(() => hook.result.current.run(() => Promise.reject(reason)));
  return hook;
};

describe('isActionError', () => {
  it.each([...ACTION_ERROR_CODES])('reconhece o código %s', (code) => {
    expect(isActionError({ code })).toBe(true);
  });

  it.each([
    ['string solta', 'boom'],
    ['null', null],
    ['objeto sem code', {}],
    ['code que não é string', { code: 7 }],
    ['code fora da lista', { code: 'meteoro' }],
  ])('não reconhece %s', (_name, value) => {
    expect(isActionError(value)).toBe(false);
  });
});

describe('useActionRunner', () => {
  it('traduz cada código conhecido na mensagem correspondente', async () => {
    const { result } = runRejecting({ code: 'alreadyPlanned' });
    await waitFor(() => expect(result.current.errorMessage).toBe('Já existe um plano para hoje.'));
  });

  it('cai na mensagem de rede quando o código é desconhecido', async () => {
    const { result } = runRejecting({ code: 'meteoro' });
    await waitFor(() => expect(result.current.errorMessage).toBe(NETWORK));
  });

  it('cai na mensagem de rede quando o erro nem é um objeto', async () => {
    const { result } = runRejecting('boom');
    await waitFor(() => expect(result.current.errorMessage).toBe(NETWORK));
  });

  it('limpa a mensagem anterior ao rodar de novo com sucesso', async () => {
    const { result } = runRejecting({ code: 'planNotFound' });
    await waitFor(() => expect(result.current.errorMessage).toBe('Plano não encontrado.'));
    act(() => result.current.run(() => Promise.resolve('ok')));
    await waitFor(() => expect(result.current.errorMessage).toBeNull());
  });
});
