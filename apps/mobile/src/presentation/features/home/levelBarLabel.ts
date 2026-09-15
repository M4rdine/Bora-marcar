import type { LevelProgress } from '@/domain';

import { t } from '../../i18n/pt-BR';

/** Lado direito da barra de nível: "90 / 100 XP" dentro do nível atual; no último, "Nível máximo". */
export function levelBarRight(level: LevelProgress): string {
  if (level.nextLevelXp === null) return t.profile.maxLevel;
  return t.level.xpWithin(
    level.totalXp - level.levelStartXp,
    level.nextLevelXp - level.levelStartXp,
  );
}
