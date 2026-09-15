import { useState } from 'react';

import { t } from '../../i18n/pt-BR';

/** Códigos de erro que os casos de uso de gamificação podem rejeitar, com mensagem própria. */
export const ACTION_ERROR_CODES = [
  'alreadyDoneToday',
  'alreadyPlanned',
  'planNotFound',
  'alreadyConfirmed',
] as const;

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

/** Roda uma mutação e converte o erro em mensagem pronta para exibição. */
export function useActionRunner(): {
  readonly run: (fn: () => Promise<unknown>) => void;
  readonly errorMessage: string | null;
} {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>) => {
    setErrorMessage(null);
    void fn().catch((e: unknown) => {
      setErrorMessage(isActionError(e) ? t.errors[e.code] : t.errors.network);
    });
  };
  return { run, errorMessage };
}
