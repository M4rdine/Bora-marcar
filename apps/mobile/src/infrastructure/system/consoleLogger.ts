import type { LogMeta, Logger } from '@/application/ports';

// Único ponto do app que fala com o console: os demais módulos recebem um Logger injetado.
const emit = (level: 'log' | 'warn' | 'error', message: string, meta?: LogMeta): void => {
  // eslint-disable-next-line no-console -- adapter de logger, ver comentário acima
  console[level](meta ? `${message} ${JSON.stringify(meta)}` : message);
};

export const consoleLogger = (): Logger => ({
  info: (m, meta) => emit('log', m, meta),
  warn: (m, meta) => emit('warn', m, meta),
  error: (m, meta) => emit('error', m, meta),
});
