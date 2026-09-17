import { arcPoints, tokenize, type Point } from './svgPath';

/** Amostras por curva de Bézier. Numa grade de 24 o erro fica muito abaixo de meio pixel. */
const CURVE_SAMPLES = 24;

function cubic(p0: Point, p1: Point, p2: Point, p3: Point): readonly Point[] {
  return Array.from({ length: CURVE_SAMPLES }, (_, i) => {
    const t = (i + 1) / CURVE_SAMPLES;
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
  });
}

function quadratic(p0: Point, p1: Point, p2: Point): readonly Point[] {
  return cubic(
    p0,
    { x: p0.x + (2 / 3) * (p1.x - p0.x), y: p0.y + (2 / 3) * (p1.y - p0.y) },
    { x: p2.x + (2 / 3) * (p1.x - p2.x), y: p2.y + (2 / 3) * (p1.y - p2.y) },
    p2,
  );
}

type Cursor = {
  readonly from: Point;
  readonly start: Point;
  /** Último controle refletido, para `S` e `T`. */
  readonly mirror: Point | null;
};

/**
 * Contorno de um caminho SVG como uma lista de polígonos — um por subcaminho.
 *
 * Diferente de `pathBounds`, aqui a curva é PERCORRIDA e não aproximada pelos pontos de controle:
 * a caixa pode ser conservadora sem mentir, o contorno não pode.
 */
export function pathPolygon(d: string): readonly (readonly Point[])[] {
  const rings: Point[][] = [];
  let ring: Point[] = [];
  let cur: Cursor = { from: { x: 0, y: 0 }, start: { x: 0, y: 0 }, mirror: null };

  const flush = (): void => {
    if (ring.length > 2) rings.push(ring);
    ring = [];
  };

  for (const { cmd, args } of tokenize(d)) {
    const upper = cmd.toUpperCase();
    const rel = cmd !== upper;
    const ax = (v: number): number => (rel ? cur.from.x + v : v);
    const ay = (v: number): number => (rel ? cur.from.y + v : v);
    const at = (i: number): Point => ({ x: ax(args[i] ?? 0), y: ay(args[i + 1] ?? 0) });

    if (upper === 'Z') {
      ring.push(cur.start);
      flush();
      cur = { from: cur.start, start: cur.start, mirror: null };
      continue;
    }
    if (upper === 'M') {
      flush();
      const p = at(0);
      ring = [p];
      cur = { from: p, start: p, mirror: null };
      continue;
    }
    if (upper === 'L') {
      const p = at(0);
      ring.push(p);
      cur = { ...cur, from: p, mirror: null };
      continue;
    }
    if (upper === 'H' || upper === 'V') {
      const p =
        upper === 'H'
          ? { x: ax(args[0] ?? 0), y: cur.from.y }
          : { x: cur.from.x, y: ay(args[0] ?? 0) };
      ring.push(p);
      cur = { ...cur, from: p, mirror: null };
      continue;
    }
    if (upper === 'A') {
      const end = { x: ax(args[5] ?? 0), y: ay(args[6] ?? 0) };
      ring.push(...arcPoints(cur.from, end, args).slice(1), end);
      cur = { ...cur, from: end, mirror: null };
      continue;
    }
    if (upper === 'C' || upper === 'S') {
      const c1 = upper === 'C' ? at(0) : (cur.mirror ?? cur.from);
      const c2 = upper === 'C' ? at(2) : at(0);
      const end = upper === 'C' ? at(4) : at(2);
      ring.push(...cubic(cur.from, c1, c2, end));
      cur = { ...cur, from: end, mirror: { x: 2 * end.x - c2.x, y: 2 * end.y - c2.y } };
      continue;
    }
    if (upper === 'Q' || upper === 'T') {
      const c = upper === 'Q' ? at(0) : (cur.mirror ?? cur.from);
      const end = upper === 'Q' ? at(2) : at(0);
      ring.push(...quadratic(cur.from, c, end));
      cur = { ...cur, from: end, mirror: { x: 2 * end.x - c.x, y: 2 * end.y - c.y } };
      continue;
    }
  }
  flush();
  return rings;
}

/**
 * O ponto cai na tinta do caminho preenchido?
 *
 * Usa a regra par-ímpar, que é a que a lua precisa: dois contornos sobrepostos se cancelam e o
 * recorte vira buraco de verdade.
 *
 * Existe porque o teste do conjunto de ícones media CONTENÇÃO e não identidade — ele garantia que
 * o desenho cabia na grade e passava alegremente numa lua que, preenchida, era um disco quase
 * cheio. Caber na grade não é parecer com o nome.
 */
export function isInsidePath(d: string, point: Point): boolean {
  let inside = false;
  for (const ring of pathPolygon(d)) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const a = ring[i] as Point;
      const b = ring[j] as Point;
      if (a.y > point.y !== b.y > point.y) {
        const x = a.x + ((point.y - a.y) * (b.x - a.x)) / (b.y - a.y);
        if (point.x < x) inside = !inside;
      }
    }
  }
  return inside;
}
