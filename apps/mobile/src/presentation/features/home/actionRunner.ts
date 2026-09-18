import { useState } from 'react';

import { t } from '../../i18n/pt-BR';

/** Códigos de erro que os casos de uso de gamificação podem rejeitar, com mensagem própria. */
export const ACTION_ERROR_CODES = ['alreadyPlanned', 'planNotFound', 'alreadyConfirmed'] as const;

export type ActionErrorCode = (typeof ACTION_ERROR_CODES)[number];

const isActionErrorCode = (code: unknown): code is ActionErrorCode =>
  typeof code === 'string' && ACTION_ERROR_CODES.some((known) => known === code);

/**
 * Só reconhece um erro cujo `code` esteja na lista acima: sem a checagem de pertinência, um
 * `code` desconhecido viraria `t.errors[code] === undefined` e a mensagem sumiria da tela.
 */
export const isActionError = (e: unknown): e is { code: ActionErrorCode } =>
  typeof e === 'object' &&
  e !== null &&
  'code' in e &&
  isActionErrorCode((e as { code: unknown }).code);

/**
 * Teto para qualquer mutação de gamificação. Nenhuma delas fala com a rede: são leitura e escrita
 * no armazenamento local. Se passar disto, algo pendurou, e deixar a tela em "carregando" para
 * sempre é pior que dizer que demorou.
 */
const TIMEOUT_MS = 8_000;

const withTimeout = async (fn: () => Promise<unknown>): Promise<unknown> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject({ code: 'timeout' }), TIMEOUT_MS);
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    clearTimeout(timer);
  }
};

const isTimeout = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 'timeout';

/** Roda uma mutação e converte o erro em mensagem pronta para exibição. */
export function useActionRunner(): {
  readonly run: (fn: () => Promise<unknown>) => void;
  readonly errorMessage: string | null;
} {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>) => {
    setErrorMessage(null);
    void withTimeout(fn).catch((e: unknown) => {
      if (isTimeout(e)) {
        setErrorMessage(t.errors.timeout);
        return;
      }
      setErrorMessage(isActionError(e) ? t.errors[e.code] : t.errors.network);
    });
  };
  return { run, errorMessage };
}
