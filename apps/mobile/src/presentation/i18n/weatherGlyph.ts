export type WeatherGlyph = { readonly emoji: string; readonly summary: string };

type Range = { readonly test: (code: number) => boolean; readonly glyph: WeatherGlyph };

const RANGES: readonly Range[] = [
  { test: (c) => c === 0, glyph: { emoji: '☀️', summary: 'céu limpo' } },
  { test: (c) => c === 1 || c === 2, glyph: { emoji: '🌤', summary: 'poucas nuvens' } },
  { test: (c) => c === 3, glyph: { emoji: '☁️', summary: 'nublado' } },
  { test: (c) => c === 45 || c === 48, glyph: { emoji: '🌫', summary: 'nevoeiro' } },
  { test: (c) => c >= 51 && c <= 57, glyph: { emoji: '🌦', summary: 'garoa' } },
  { test: (c) => c >= 61 && c <= 67, glyph: { emoji: '🌧', summary: 'chuva' } },
  { test: (c) => c >= 80 && c <= 82, glyph: { emoji: '🌧', summary: 'pancadas' } },
  {
    test: (c) => (c >= 71 && c <= 77) || c === 85 || c === 86,
    glyph: { emoji: '🌨', summary: 'neve' },
  },
  { test: (c) => c >= 95 && c <= 99, glyph: { emoji: '⛈', summary: 'trovoada' } },
];

const FALLBACK: WeatherGlyph = { emoji: '🌡', summary: 'sem dados' };

/** Emoji + resumo curto em PT-BR para um código WMO de tempo. */
export function weatherGlyph(code: number): WeatherGlyph {
  return RANGES.find((range) => range.test(code))?.glyph ?? FALLBACK;
}
