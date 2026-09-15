import pino from 'pino';

import type { Env } from './config/env';

export type Logger = pino.Logger;

export const createLogger = (level: Env['LOG_LEVEL']): Logger => pino({ level });
export const silentLogger = (): Logger => pino({ enabled: false });
