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
const SAMPLES_PER_SEGMENT = 16;

const alphaOf = (rgba: string): number => Number(rgba.split(',')[3]?.replace(')', '') ?? '0');

const SURFACE = alphaOf(tokens.color.surface);
const SURFACE_STRONG = alphaOf(tokens.color.surfaceStrong);
const MUTED = alphaOf(tokens.color.textMuted);

const mix = (a: Rgb, b: Rgb, ratio: number): Rgb =>
  [0, 1, 2].map((i) =>
    Math.round((a[i] as number) + ((b[i] as number) - (a[i] as number)) * ratio),
  ) as unknown as Rgb;

/**
 * Amostra densa de um gradiente. Testar só as paradas deixaria passar um vale de contraste no
 * meio de um segmento, que é exatamente onde o texto costuma cair.
 */
function samplesOf(phase: SkyPhase): readonly Rgb[] {
  const stops = tokens.gradients[phase].map(hexToRgb);
  return stops.flatMap((stop, index) => {
    const next = stops[index + 1];
    if (next === undefined) return [stop];
    return Array.from({ length: SAMPLES_PER_SEGMENT }, (_, step) =>
      mix(stop, next, step / SAMPLES_PER_SEGMENT),
    );
  });
}

const PHASES: readonly SkyPhase[] = ['dawn', 'day', 'dusk', 'night', 'rainy'];

/** O pior contraste de uma tinta contra o céu, opcionalmente com uma superfície no meio. */
function worstRatio(
  ink: Rgb,
  surfaceAlpha: number | null,
): { readonly ratio: number; readonly phase: SkyPhase } {
  return PHASES.flatMap((phase) =>
    samplesOf(phase).map((sky) => ({
      phase,
      ratio: contrastRatio(
        ink,
        surfaceAlpha === null ? sky : stack(sky, [{ color: BLACK, alpha: surfaceAlpha }]),
      ),
    })),
  ).reduce((worst, candidate) => (candidate.ratio < worst.ratio ? candidate : worst));
}

describe('contraste do texto sobre o céu', () => {
  it('tinta branca lê DIRETO sobre o céu, em nível AA para texto normal', () => {
    const worst = worstRatio(WHITE, null);
    expect({ fase: worst.phase, passa: worst.ratio >= WCAG_AA.normalText }).toEqual({
      fase: worst.phase,
      passa: true,
    });
  });

  it('e lê com folga sobre as duas superfícies', () => {
    expect(worstRatio(WHITE, SURFACE).ratio).toBeGreaterThanOrEqual(WCAG_AA.normalText);
    expect(worstRatio(WHITE, SURFACE_STRONG).ratio).toBeGreaterThanOrEqual(WCAG_AA.normalText);
  });

  it('o texto secundário passa ao menos no limiar de texto grande, direto no céu', () => {
    const muted = composite(WHITE, MUTED, BLACK);
    expect(worstRatio(muted, null).ratio).toBeGreaterThanOrEqual(WCAG_AA.largeText);
  });

  it('não existe véu: o céu é escuro por escolha de paleta, não por preto por cima', () => {
    expect('scrim' in tokens).toBe(false);
  });

  it('as duas superfícies são materiais distintos, não a mesma com outro nome', () => {
    const MIN_SEPARATION = 0.1;
    expect(SURFACE_STRONG - SURFACE).toBeGreaterThanOrEqual(MIN_SEPARATION);
  });

  it('toda fase escurece do topo para a base, para o céu ter direção', () => {
    for (const phase of PHASES) {
      const stops = tokens.gradients[phase].map(hexToRgb);
      const first = stops[0] as Rgb;
      const last = stops[stops.length - 1] as Rgb;
      expect(luminance(first)).toBeGreaterThan(luminance(last));
    }
  });

  it('as fases são distinguíveis entre si, senão o céu não informa a hora', () => {
    const MIN_DIFFERENCE = 24;
    const tops = PHASES.map((phase) => hexToRgb(tokens.gradients[phase][0]));
    for (let i = 0; i < tops.length; i += 1) {
      for (let j = i + 1; j < tops.length; j += 1) {
        const a = tops[i] as Rgb;
        const b = tops[j] as Rgb;
        const distance = Math.max(
          ...[0, 1, 2].map((c) => Math.abs((a[c] as number) - (b[c] as number))),
        );
        expect(distance).toBeGreaterThanOrEqual(MIN_DIFFERENCE);
      }
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
