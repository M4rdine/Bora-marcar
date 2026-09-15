import { useState } from 'react';

import { t } from '../../i18n/pt-BR';

export type ActionErrorCode =
  'alreadyDoneToday' | 'alreadyPlanned' | 'planNotFound' | 'alreadyConfirmed';

export const isActionError = (e: unknown): e is { code: ActionErrorCode } =>
  typeof e === 'object' &&
  e !== null &&
  'code' in e &&
  typeof (e as { code: unknown }).code === 'string';

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
