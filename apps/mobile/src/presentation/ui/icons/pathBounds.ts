import { arcPoints, tokenize, type Point } from './svgPath';

export type Bounds = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

/**
 * Caixa que contém um caminho SVG.
 *
 * Existe porque o teste do conjunto de ícones validava linha e círculo e não validava caminho, e
 * foi exatamente um caminho que saiu da grade: o raio da trovoada terminava em y=25,5 num
 * `viewBox` de 24, era cortado, e a trovoada passou a desenhar como nuvem lisa.
 *
 * Para curvas de Bézier a caixa dos pontos de controle já contém a curva — é a propriedade do
 * fecho convexo —, então incluir os controles basta e nunca subestima. Arcos são percorridos:
 * limitar pela elipse inteira seria conservador demais e acusaria vazamento num arco pequeno que
 * mal se afasta da corda, então o arco é amostrado ao longo do ângulo que ele de fato varre.
 */
function pointsOf(
  cmd: string,
  args: readonly number[],
  from: Point,
  start: Point,
): { readonly points: readonly Point[]; readonly next: Point; readonly newStart?: Point } {
  const upper = cmd.toUpperCase();
  const relative = cmd !== upper;
  const ax = (v: number): number => (relative ? from.x + v : v);
  const ay = (v: number): number => (relative ? from.y + v : v);
  const pairs = (): Point[] => {
    const out: Point[] = [];
    for (let i = 0; i + 1 < args.length; i += 2) {
      out.push({ x: ax(args[i] as number), y: ay(args[i + 1] as number) });
    }
    return out;
  };

  if (upper === 'Z') return { points: [start], next: start };
  if (upper === 'H') {
    const p = { x: ax(args[0] ?? 0), y: from.y };
    return { points: [p], next: p };
  }
  if (upper === 'V') {
    const p = { x: from.x, y: ay(args[0] ?? 0) };
    return { points: [p], next: p };
  }
  if (upper === 'A') {
    // rx ry rot large sweep x y
    const end = { x: ax(args[5] ?? 0), y: ay(args[6] ?? 0) };
    return { points: [...arcPoints(from, end, args), end], next: end };
  }

  const points = pairs();
  const last = points[points.length - 1] ?? from;
  if (upper === 'M') return { points, next: last, newStart: last };
  return { points, next: last };
}

export function pathBounds(d: string): Bounds {
  let from: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { cmd, args } of tokenize(d)) {
    const { points, next, newStart } = pointsOf(cmd, args, from, start);
    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    from = next;
    if (newStart !== undefined) start = newStart;
  }

  return { minX, minY, maxX, maxY };
}
