export type Rgb = readonly [number, number, number];

const HEX_RADIX = 16;
const CHANNEL_MAX = 255;
const SRGB_KNEE = 0.03928;
const SRGB_DIVISOR = 12.92;
const SRGB_OFFSET = 0.055;
const SRGB_SCALE = 1.055;
const SRGB_EXPONENT = 2.4;
const LUMA = { r: 0.2126, g: 0.7152, b: 0.0722 } as const;
const CONTRAST_OFFSET = 0.05;
const HEX_PAIR = 2;

/** `#RRGGBB` para canais 0–255. */
export function hexToRgb(hex: string): Rgb {
  const body = hex.replace('#', '');
  const channel = (index: number): number =>
    parseInt(body.slice(index * HEX_PAIR, index * HEX_PAIR + HEX_PAIR), HEX_RADIX);
  return [channel(0), channel(1), channel(2)];
}

const channelLuminance = (value: number): number => {
  const c = value / CHANNEL_MAX;
  return c <= SRGB_KNEE
    ? c / SRGB_DIVISOR
    : Math.pow((c + SRGB_OFFSET) / SRGB_SCALE, SRGB_EXPONENT);
};

/** Luminância relativa da WCAG 2.1. */
export function luminance([r, g, b]: Rgb): number {
  return LUMA.r * channelLuminance(r) + LUMA.g * channelLuminance(g) + LUMA.b * channelLuminance(b);
}

/** Razão de contraste da WCAG 2.1, sempre >= 1. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (lighter + CONTRAST_OFFSET) / (darker + CONTRAST_OFFSET);
}

/**
 * Composição alfa de `top` sobre `bottom`. É assim que o app empilha véu e superfície sobre o
 * gradiente, então é assim que o contraste precisa ser calculado: sobre o pixel final.
 */
export function composite(top: Rgb, alpha: number, bottom: Rgb): Rgb {
  return [0, 1, 2].map((i) => {
    const t = top[i] as number;
    const b = bottom[i] as number;
    return Math.round(t * alpha + b * (1 - alpha));
  }) as unknown as Rgb;
}

/** Empilha várias camadas translúcidas sobre um fundo, da mais funda para a mais alta. */
export function stack(
  bottom: Rgb,
  layers: readonly { readonly color: Rgb; readonly alpha: number }[],
): Rgb {
  return layers.reduce((ground, layer) => composite(layer.color, layer.alpha, ground), bottom);
}

/** Limiares da WCAG 2.1 nível AA. */
export const WCAG_AA = { normalText: 4.5, largeText: 3 } as const;
