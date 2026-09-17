import type { BadgeState } from '@/domain';

export type NextBadge = {
  readonly badge: BadgeState;
  readonly current: number;
  readonly target: number;
  /** 0 a 1. É o que ordena: a conquista mais perto é a que dá mais motivo para voltar. */
  readonly ratio: number;
};

/**
 * A conquista bloqueada mais perto de sair.
 *
 * Uma grade de oito medalhas bloqueadas e visualmente iguais não dá motivo para nada. Promover a
 * que está mais perto transforma a coleção numa meta: falta pouco, e dá para ver quanto.
 *
 * Conquistas sem progresso medível (as que acontecem de uma vez, como sair antes das 7h) ficam de
 * fora: não há "quanto falta" para mostrar, então elas não competem por este lugar.
 */
export function nextBadge(badges: readonly BadgeState[]): NextBadge | null {
  return badges
    .flatMap((badge): NextBadge[] => {
      if (badge.unlocked || badge.progress === null) return [];
      const { current, target } = badge.progress;
      if (target <= 0 || current <= 0) return [];
      return [{ badge, current, target, ratio: current / target }];
    })
    .reduce<NextBadge | null>(
      (best, candidate) => (best === null || candidate.ratio > best.ratio ? candidate : best),
      null,
    );
}
