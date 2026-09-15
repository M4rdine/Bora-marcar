import { z } from 'zod';

export type RawEnv = {
  readonly apiMode?: string | undefined;
  readonly bffUrl?: string | undefined;
  readonly assetsUrl?: string | undefined;
};
export type AppEnv = {
  readonly apiMode: 'direct' | 'bff';
  readonly bffUrl: string | null;
  readonly assetsUrl: string | null;
};

const schema = z.object({
  apiMode: z.enum(['direct', 'bff']).catch('direct'),
  bffUrl: z.url().nullable().catch(null),
  assetsUrl: z.url().nullable().catch(null),
});

export function parseEnv(raw: RawEnv): AppEnv {
  return schema.parse({
    apiMode: raw.apiMode,
    bffUrl: raw.bffUrl ?? null,
    assetsUrl: raw.assetsUrl ?? null,
  });
}

/** As variáveis EXPO_PUBLIC_* só são inlinadas quando acessadas literalmente. */
export const readEnv = (): AppEnv =>
  parseEnv({
    apiMode: process.env.EXPO_PUBLIC_API_MODE,
    bffUrl: process.env.EXPO_PUBLIC_BFF_URL,
    assetsUrl: process.env.EXPO_PUBLIC_ASSETS_URL,
  });
