import type { LevelDef } from '../config/types';

export type LevelProgress = {
  readonly level: number;
  readonly name: string;
  readonly totalXp: number;
  readonly levelStartXp: number;
  readonly nextLevelXp: number | null;
  readonly xpToNext: number | null;
  readonly progress: number; // 0–1
};

export function levelFor(totalXp: number, levels: readonly LevelDef[]): LevelProgress {
  const sorted = [...levels].sort((a, b) => a.xp - b.xp);
  const idx = sorted.reduce((acc, l, i) => (totalXp >= l.xp ? i : acc), 0);
  const current = sorted[idx] ?? { level: 1, xp: 0, name: '' };
  const next = sorted[idx + 1] ?? null;
  const span = next === null ? 0 : next.xp - current.xp;
  return {
    level: current.level,
    name: current.name,
    totalXp,
    levelStartXp: current.xp,
    nextLevelXp: next === null ? null : next.xp,
    xpToNext: next === null ? null : next.xp - totalXp,
    progress: next === null ? 1 : (totalXp - current.xp) / span,
  };
}
