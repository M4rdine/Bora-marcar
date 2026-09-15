import { z } from 'zod';

export type RawEnv = {
  readonly apiMode?: string | undefined;
  readonly bffUrl?: string | undefined;
  readonly assetsUrl?: string | undefined;
};
export type AppEnv =
  | { readonly apiMode: 'direct'; readonly bffUrl: null; readonly assetsUrl: null }
  | { readonly apiMode: 'bff'; readonly bffUrl: string; readonly assetsUrl: string };

export class EnvError extends Error {}

const mode = z.enum(['direct', 'bff']).catch('direct');
const url = z.url();

/** `bff` exige as duas URLs válidas: configuração quebrada deve aparecer, não virar `direct` em silêncio. */
export function parseEnv(raw: RawEnv): AppEnv {
  if (mode.parse(raw.apiMode) === 'direct')
    return { apiMode: 'direct', bffUrl: null, assetsUrl: null };
  const bff = url.safeParse(raw.bffUrl);
  if (!bff.success) throw new EnvError('EXPO_PUBLIC_API_MODE=bff exige EXPO_PUBLIC_BFF_URL válida');
  const assets = url.safeParse(raw.assetsUrl);
  if (!assets.success)
    throw new EnvError('EXPO_PUBLIC_API_MODE=bff exige EXPO_PUBLIC_ASSETS_URL válida');
  return { apiMode: 'bff', bffUrl: bff.data, assetsUrl: assets.data };
}

/** As variáveis EXPO_PUBLIC_* só são inlinadas quando acessadas literalmente. */
export const readEnv = (): AppEnv =>
  parseEnv({
    apiMode: process.env.EXPO_PUBLIC_API_MODE,
    bffUrl: process.env.EXPO_PUBLIC_BFF_URL,
    assetsUrl: process.env.EXPO_PUBLIC_ASSETS_URL,
  });
