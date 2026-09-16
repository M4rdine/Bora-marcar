import { FACTOR_IDS, type ActivityProfile, type FactorId, type HourScore } from '@/domain';

/**
 * Um fator do score de uma hora, já pronto para exibição. `impact` é o quanto ele derruba a nota
 * naquela atividade: peso vezes o desconforto. É por isso que "sol a pino" pesa numa corrida e
 * quase não pesa num piquenique à sombra.
 */
export type FactorRow = {
  readonly id: FactorId;
  readonly comfort: number;
  readonly weight: number;
  readonly impact: number;
};

/**
 * Fatores de uma hora ordenados pelo que mais derruba a nota. O primeiro da lista é a resposta
 * para "por que esta hora não é boa?", que hoje o motor sabe e a interface não contava.
 */
export function factorBreakdown(hour: HourScore, profile: ActivityProfile): readonly FactorRow[] {
  return FACTOR_IDS.map((id): FactorRow => {
    const comfort = hour.comforts[id];
    const weight = profile.weights[id];
    return { id, comfort, weight, impact: weight * (1 - comfort) };
  })
    .slice()
    .sort((a, b) => b.impact - a.impact);
}

/** O fator que mais limita a hora, ou `null` quando nenhum atrapalha de verdade. */
export function limitingFactor(rows: readonly FactorRow[], minImpact: number): FactorRow | null {
  const first = rows[0];
  if (first === undefined) return null;
  return first.impact >= minImpact ? first : null;
}
