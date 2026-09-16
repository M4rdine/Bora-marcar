import {
  composite,
  contrastRatio,
  hexToRgb,
  luminance,
  stack,
  WCAG_AA,
  type Rgb,
} from './contrast';
import { tokens, type SkyPhase } from './tokens';

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
const SAMPLES_PER_SEGMENT = 12;

const alphaOf = (rgba: string): number => Number(rgba.split(',')[3]?.replace(')', '') ?? '0');

const SCRIM_TOP = alphaOf(tokens.scrim[0]);
const SCRIM_BOTTOM = alphaOf(tokens.scrim[1]);
const SURFACE = alphaOf(tokens.color.surface);
const SURFACE_STRONG = alphaOf(tokens.color.surfaceStrong);
const MUTED = alphaOf(tokens.color.textMuted);

const mix = (a: Rgb, b: Rgb, ratio: number): Rgb =>
  [0, 1, 2].map((i) =>
    Math.round((a[i] as number) + ((b[i] as number) - (a[i] as number)) * ratio),
  ) as unknown as Rgb;

/**
 * Amostra densa de um gradiente: a cor e a posição vertical de cada ponto. Testar só as paradas
 * deixaria passar um vale de contraste no meio de um segmento.
 */
function samplesOf(phase: SkyPhase): readonly { readonly color: Rgb; readonly position: number }[] {
  const stops = tokens.gradients[phase].map(hexToRgb);
  const segments = stops.length - 1;
  return stops.flatMap((stop, index) => {
    if (index === segments) return [{ color: stop, position: 1 }];
    const next = stops[index + 1] as Rgb;
    return Array.from({ length: SAMPLES_PER_SEGMENT }, (_, step) => {
      const within = step / SAMPLES_PER_SEGMENT;
      return {
        color: mix(stop, next, within),
        position: (index + within) / segments,
      };
    });
  });
}

/** O pixel final atrás do texto: céu, véu na altura daquele ponto e, quando houver, a superfície. */
function groundAt(
  phase: SkyPhase,
  sample: { readonly color: Rgb; readonly position: number },
  surfaceAlpha: number | null,
): Rgb {
  const scrimAlpha = SCRIM_TOP + (SCRIM_BOTTOM - SCRIM_TOP) * sample.position;
  const layers = [{ color: BLACK, alpha: scrimAlpha }];
  return stack(
    sample.color,
    surfaceAlpha === null ? layers : [...layers, { color: BLACK, alpha: surfaceAlpha }],
  );
}

const PHASES: readonly SkyPhase[] = ['dawn', 'day', 'dusk', 'night', 'rainy'];

const worstRatio = (surfaceAlpha: number | null, ink: Rgb): { ratio: number; where: string } =>
  PHASES.flatMap((phase) =>
    samplesOf(phase).map((sample) => ({
      ratio: contrastRatio(ink, groundAt(phase, sample, surfaceAlpha)),
      where: `${phase} em ${(sample.position * 100).toFixed(0)}%`,
    })),
  ).reduce((worst, candidate) => (candidate.ratio < worst.ratio ? candidate : worst));

describe('contraste do texto sobre o céu', () => {
  it('tinta branca direto sobre o céu passa no nível AA para texto normal, em toda a tela', () => {
    const worst = worstRatio(null, WHITE);
    expect({ where: worst.where, ok: worst.ratio >= WCAG_AA.normalText }).toEqual({
      where: worst.where,
      ok: true,
    });
  });

  it('tinta branca sobre as duas superfícies passa com folga', () => {
    expect(worstRatio(SURFACE, WHITE).ratio).toBeGreaterThanOrEqual(WCAG_AA.normalText);
    expect(worstRatio(SURFACE_STRONG, WHITE).ratio).toBeGreaterThanOrEqual(WCAG_AA.normalText);
  });

  it('texto secundário continua legível, ao menos no limiar de texto grande', () => {
    const muted = composite(WHITE, MUTED, BLACK);
    expect(worstRatio(null, muted).ratio).toBeGreaterThanOrEqual(WCAG_AA.largeText);
  });

  it('as duas superfícies são materiais distintos, não a mesma com outro nome', () => {
    const MIN_SEPARATION = 0.08;
    expect(SURFACE_STRONG - SURFACE).toBeGreaterThanOrEqual(MIN_SEPARATION);
  });

  it('o véu escurece mais no topo, que é onde todas as fases têm o tom claro', () => {
    expect(SCRIM_TOP).toBeGreaterThan(SCRIM_BOTTOM);
    for (const phase of PHASES) {
      const stops = tokens.gradients[phase].map(hexToRgb);
      const first = stops[0] as Rgb;
      const last = stops[stops.length - 1] as Rgb;
      expect(luminance(first)).toBeGreaterThan(luminance(last));
    }
  });
});

describe('matemática de contraste', () => {
  it('preto sobre branco é a razão máxima da WCAG', () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 1);
  });

  it('uma cor contra ela mesma não tem contraste', () => {
    expect(contrastRatio(WHITE, WHITE)).toBeCloseTo(1, 5);
  });

  it('a ordem dos argumentos não muda a razão', () => {
    const a: Rgb = [12, 34, 56];
    expect(contrastRatio(a, WHITE)).toBeCloseTo(contrastRatio(WHITE, a), 10);
  });

  it('lê hexadecimal com e sem cerquilha', () => {
    expect(hexToRgb('#F6C9A0')).toEqual([246, 201, 160]);
    expect(hexToRgb('3B3F7A')).toEqual([59, 63, 122]);
  });

  it('compor com alfa 1 devolve a cor de cima e com 0 a de baixo', () => {
    expect(composite(WHITE, 1, BLACK)).toEqual(WHITE);
    expect(composite(WHITE, 0, BLACK)).toEqual(BLACK);
  });

  it('empilhar camadas é o mesmo que compor uma a uma', () => {
    const bottom: Rgb = [200, 100, 50];
    const stacked = stack(bottom, [
      { color: BLACK, alpha: 0.5 },
      { color: BLACK, alpha: 0.25 },
    ]);
    expect(stacked).toEqual(composite(BLACK, 0.25, composite(BLACK, 0.5, bottom)));
  });
});
