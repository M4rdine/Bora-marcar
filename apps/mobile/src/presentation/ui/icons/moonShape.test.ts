import { pathBounds } from './pathBounds';
import { isInsidePath } from './pathPolygon';
import { ICON_SHAPES } from './paths';

/** Todo caminho preenchido do ícone, na ordem em que é desenhado. */
function filledPaths(name: 'clearNight' | 'fewCloudsNight' | 'clear'): readonly string[] {
  return ICON_SHAPES[name].flatMap((shape) =>
    shape.kind === 'path' && shape.fill === true ? [shape.d] : [],
  );
}

/** Fração da caixa do desenho que recebe tinta, por amostragem numa grade de 60 por 60. */
function inkFraction(d: string): number {
  const b = pathBounds(d);
  const STEPS = 60;
  let hits = 0;
  for (let i = 0; i < STEPS; i += 1) {
    for (let j = 0; j < STEPS; j += 1) {
      const x = b.minX + ((i + 0.5) * (b.maxX - b.minX)) / STEPS;
      const y = b.minY + ((j + 0.5) * (b.maxY - b.minY)) / STEPS;
      if (isInsidePath(d, { x, y })) hits += 1;
    }
  }
  return hits / (STEPS * STEPS);
}

/**
 * O critério que o teste de grade não tinha.
 *
 * `Icon.test.tsx` mede CONTENÇÃO: o desenho cabe na grade de 24. Uma lua que preenchia como disco
 * quase sólido cabia perfeitamente e passava. Caber não é parecer com o nome, então aqui a
 * pergunta é outra — o crescente tem mordida?
 */
describe('a lua desenha um crescente, não um disco', () => {
  const cases = [
    { name: 'clearNight' as const, body: { x: 5, y: 12 }, bite: { x: 16.5, y: 9 } },
    { name: 'fewCloudsNight' as const, body: { x: 4.6, y: 7.6 }, bite: { x: 12, y: 5.2 } },
  ];

  it.each(cases)('$name tem tinta no corpo do crescente', ({ name, body }) => {
    const [moon] = filledPaths(name);
    expect(isInsidePath(moon as string, body)).toBe(true);
  });

  it.each(cases)('$name tem a mordida VAZIA, que é o que faz a lua', ({ name, bite }) => {
    const [moon] = filledPaths(name);
    expect(isInsidePath(moon as string, bite)).toBe(false);
  });

  /**
   * Um disco cheio ocupa pi/4 da própria caixa, ou seja 79%. O crescente anterior batia nesse
   * teto; um crescente de verdade fica bem abaixo dele.
   */
  it.each(cases)('$name não preenche como disco', ({ name }) => {
    const [moon] = filledPaths(name);
    const ink = inkFraction(moon as string);
    expect(ink).toBeGreaterThan(0.2);
    expect(ink).toBeLessThan(0.55);
  });

  it('a lua e o sol não desenham a mesma coisa', () => {
    const sun = ICON_SHAPES.clear.filter((s) => s.kind === 'circle');
    expect(sun.length).toBeGreaterThan(0);
    const [moon] = filledPaths('clearNight');
    // O sol é círculo; a lua não pode ser um círculo disfarçado de caminho.
    expect(inkFraction(moon as string)).toBeLessThan(0.7);
  });
});
