/**
 * Leitura de um caminho SVG: separar os comandos e percorrer arcos.
 *
 * Mora sozinho porque dois consumidores precisam da mesma leitura e respondem perguntas
 * diferentes: `pathBounds` quer a caixa que contém o desenho, `pathPolygon` quer o contorno para
 * perguntar se um ponto está dentro dele.
 */
export type Point = { x: number; y: number };

const ARG_COUNT: Record<string, number> = {
  M: 2,
  L: 2,
  T: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  A: 7,
  Z: 0,
};

/** Comando que, repetido sem letra, vira outro: um `M` extra é `L`, um `m` extra é `l`. */
const REPEATED_AS: Record<string, string> = { M: 'L', m: 'l' };

const NUMBER = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
const COMMAND = /[MmLlHhVvCcSsQqTtAaZz]/;

export function tokenize(d: string): { readonly cmd: string; readonly args: number[] }[] {
  const out: { cmd: string; args: number[] }[] = [];
  let index = 0;
  let current: string | null = null;
  while (index < d.length) {
    const char = d[index] as string;
    if (COMMAND.test(char)) {
      current = char;
      index += 1;
      if (char === 'Z' || char === 'z') out.push({ cmd: 'Z', args: [] });
      continue;
    }
    if (current === null) {
      index += 1;
      continue;
    }
    NUMBER.lastIndex = index;
    const match = NUMBER.exec(d);
    if (match === null || match.index !== index) {
      index += 1;
      continue;
    }
    const upper = current.toUpperCase();
    const size = ARG_COUNT[upper] ?? 0;
    const args: number[] = [];
    let cursor = index;
    for (let i = 0; i < size; i += 1) {
      NUMBER.lastIndex = cursor;
      const m = NUMBER.exec(d);
      if (m === null) break;
      args.push(Number(m[0]));
      cursor = m.index + m[0].length;
    }
    out.push({ cmd: current, args });
    index = cursor;
    // Um comando repetido sem a letra: só `M`/`m` trocam de identidade, os demais se repetem.
    current = REPEATED_AS[current] ?? current;
  }
  return out;
}

/** Quantos pontos amostrar ao longo do arco. Numa grade de 24, o erro fica bem abaixo de 0,01. */
const ARC_SAMPLES = 64;

/**
 * Pontos ao longo de um arco, pela conversão de pontas para centro da especificação SVG (F.6.5).
 *
 * Amostrar o ângulo de fato varrido é o que separa um arco que dá quase a volta inteira — e por
 * isso alcança longe — de um que mal se afasta da corda. Limitar os dois pela elipse inteira
 * acusaria vazamento no segundo, que é exatamente o falso positivo que a lua produziu.
 */
export function arcPoints(from: Point, end: Point, args: readonly number[]): readonly Point[] {
  const [rxRaw = 0, ryRaw = 0, rotDeg = 0, large = 0, sweep = 0] = args;
  const rx = Math.abs(rxRaw);
  const ry = Math.abs(ryRaw);
  // Raio zero degenera o arco numa reta, e a reta já está nas pontas.
  if (rx === 0 || ry === 0) return [from, end];

  const phi = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (from.x - end.x) / 2;
  const dy = (from.y - end.y) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;

  // Raios pequenos demais para alcançar as duas pontas são ampliados, como manda a especificação.
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  const scale = lambda > 1 ? Math.sqrt(lambda) : 1;
  const a = rx * scale;
  const b = ry * scale;

  const num = a * a * b * b - a * a * y1 * y1 - b * b * x1 * x1;
  const den = a * a * y1 * y1 + b * b * x1 * x1;
  const factor = den === 0 ? 0 : Math.sqrt(Math.max(0, num / den));
  const sign = large === sweep ? -1 : 1;
  const cx1 = sign * factor * ((a * y1) / b);
  const cy1 = sign * factor * (-(b * x1) / a);
  const cx = cos * cx1 - sin * cy1 + (from.x + end.x) / 2;
  const cy = sin * cx1 + cos * cy1 + (from.y + end.y) / 2;

  // Ângulo inicial e varrido, para percorrer só o pedaço que o arco de fato desenha.
  const angle = (ux: number, uy: number, vx: number, vy: number): number => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    const raw = Math.acos(Math.min(1, Math.max(-1, len === 0 ? 1 : dot / len)));
    return ux * vy - uy * vx < 0 ? -raw : raw;
  };
  const sx = (x1 - cx1) / a;
  const sy = (y1 - cy1) / b;
  const exx = (-x1 - cx1) / a;
  const exy = (-y1 - cy1) / b;
  const theta1 = angle(1, 0, sx, sy);
  let delta = angle(sx, sy, exx, exy);
  const TURN = 2 * Math.PI;
  if (sweep === 0 && delta > 0) delta -= TURN;
  if (sweep !== 0 && delta < 0) delta += TURN;

  return Array.from({ length: ARC_SAMPLES + 1 }, (_, i) => {
    const t = theta1 + (delta * i) / ARC_SAMPLES;
    const px = a * Math.cos(t);
    const py = b * Math.sin(t);
    return { x: cx + cos * px - sin * py, y: cy + sin * px + cos * py };
  });
}
