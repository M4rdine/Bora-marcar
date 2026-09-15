import { z } from 'zod';

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  REDIS_URL: z.url().optional(),
  ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o.length > 0),
    ),
  OPEN_METEO_BASE_URL: z.url().default('https://api.open-meteo.com'),
  GEOCODING_BASE_URL: z.url().default('https://geocoding-api.open-meteo.com'),
  RATE_LIMIT_PER_MIN: z.coerce.number().int().min(1).default(60),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().int().min(100).default(5000),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  APP_VERSION: z.string().default('dev'),
});

export type Env = z.infer<typeof schema>;

/** Valida as variáveis na inicialização; uma inválida derruba o processo com a lista de campos. */
export function loadEnv(source: NodeJS.ProcessEnv): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Variáveis de ambiente inválidas — ${fields}`);
  }
  // REDIS_URL é opcional no schema: quando ausente, zod omite a chave do objeto de saída.
  // Explicitamos a chave (com valor undefined) para que o shape do Env seja sempre estável.
  return { ...parsed.data, REDIS_URL: parsed.data.REDIS_URL };
}
