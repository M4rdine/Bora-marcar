import type { IconName } from '../ui/icons/paths';

export type WeatherGlyph = { readonly icon: IconName; readonly summary: string };

type Range = {
  readonly test: (code: number) => boolean;
  readonly glyph: WeatherGlyph;
  /** Versão noturna, quando o céu aberto muda de desenho. Nublado é nublado a qualquer hora. */
  readonly night?: WeatherGlyph;
};

const RANGES: readonly Range[] = [
  {
    test: (c) => c === 0,
    glyph: { icon: 'clear', summary: 'céu limpo' },
    night: { icon: 'clearNight', summary: 'céu limpo' },
  },
  {
    test: (c) => c === 1 || c === 2,
    glyph: { icon: 'fewClouds', summary: 'poucas nuvens' },
    night: { icon: 'fewCloudsNight', summary: 'poucas nuvens' },
  },
  { test: (c) => c === 3, glyph: { icon: 'cloudy', summary: 'nublado' } },
  { test: (c) => c === 45 || c === 48, glyph: { icon: 'fog', summary: 'nevoeiro' } },
  { test: (c) => c >= 51 && c <= 57, glyph: { icon: 'drizzle', summary: 'garoa' } },
  { test: (c) => c >= 61 && c <= 67, glyph: { icon: 'rain', summary: 'chuva' } },
  { test: (c) => c >= 80 && c <= 82, glyph: { icon: 'showers', summary: 'pancadas' } },
  {
    test: (c) => (c >= 71 && c <= 77) || c === 85 || c === 86,
    glyph: { icon: 'snow', summary: 'neve' },
  },
  { test: (c) => c >= 95 && c <= 99, glyph: { icon: 'thunder', summary: 'trovoada' } },
];

const FALLBACK: WeatherGlyph = { icon: 'cloudy', summary: 'sem dados' };

/**
 * Ícone do conjunto do app e resumo curto em pt-BR para um código WMO de tempo.
 *
 * `isDay` importa: sem ele o app desenhava o sol a pino às 23h. O dado sempre existiu na previsão
 * e o motor já o usava para pontuar (`scoreHour.ts`); só a interface o ignorava.
 */
export function weatherGlyph(code: number, isDay = true): WeatherGlyph {
  const range = RANGES.find((r) => r.test(code));
  if (range === undefined) return FALLBACK;
  return isDay ? range.glyph : (range.night ?? range.glyph);
}
