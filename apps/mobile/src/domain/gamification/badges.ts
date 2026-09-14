import { ACTIVITY_IDS } from '../activities/types';

import type { ActivityRecord } from './records';
import { computeStreak } from './streak';

export const BADGE_IDS = [
  'first',
  'early',
  'owl',
  'explorer',
  'planner',
  'week',
  'multi',
  'perfect',
] as const;
export type BadgeId = (typeof BADGE_IDS)[number];

export type BadgeState = {
  readonly id: BadgeId;
  readonly unlocked: boolean;
  readonly unlockedOn: string | null;
  readonly progress: { readonly current: number; readonly target: number } | null;
};

const TARGETS = { explorer: 5, planner: 10, week: 7, multi: ACTIVITY_IDS.length } as const;
const EARLY_BEFORE_HOUR = 7;
const OWL_FROM_HOUR = 20;
const PERFECT_SCORE = 95;

type Rule = {
  readonly id: BadgeId;
  readonly target: number | null;
  /** valor acumulado até o prefixo de registros (inclusive) */
  readonly measure: (prefix: readonly ActivityRecord[], restDates: ReadonlySet<string>) => number;
};

const distinct = <T>(xs: readonly T[]): number => new Set(xs).size;
const streakAt = (prefix: readonly ActivityRecord[], rest: ReadonlySet<string>): number =>
  // prefix nunca é vazio: só é chamado com records.slice(0, i + 1)
  computeStreak(
    new Set(prefix.map((r) => r.date)),
    rest,
    (prefix[prefix.length - 1] as ActivityRecord).date,
  );

const RULES: readonly Rule[] = [
  // p nunca é vazio: measure só é chamado via records.slice(0, i + 1) com i sobre um records não vazio
  { id: 'first', target: null, measure: () => 1 },
  {
    id: 'early',
    target: null,
    measure: (p) => (p.some((r) => r.hourLeft < EARLY_BEFORE_HOUR) ? 1 : 0),
  },
  { id: 'owl', target: null, measure: (p) => (p.some((r) => r.hourLeft >= OWL_FROM_HOUR) ? 1 : 0) },
  { id: 'explorer', target: TARGETS.explorer, measure: (p) => distinct(p.map((r) => r.cityId)) },
  {
    id: 'planner',
    target: TARGETS.planner,
    measure: (p) => p.filter((r) => r.planFulfilled).length,
  },
  { id: 'week', target: TARGETS.week, measure: (p, rest) => streakAt(p, rest) },
  { id: 'multi', target: TARGETS.multi, measure: (p) => distinct(p.map((r) => r.activity)) },
  {
    id: 'perfect',
    target: null,
    measure: (p) => (p.some((r) => r.hourScore >= PERFECT_SCORE) ? 1 : 0),
  },
];

/** Avalia a medida em cada prefixo (uma vez por prefixo): desbloqueio = primeiro prefixo que atinge o alvo. */
function evaluate(
  rule: Rule,
  records: readonly ActivityRecord[],
  rest: ReadonlySet<string>,
): BadgeState {
  const target = rule.target ?? 1;
  const values = records.map((_, i) => rule.measure(records.slice(0, i + 1), rest));
  const unlockIndex = values.findIndex((v) => v >= target);
  const peak = Math.min(Math.max(0, ...values), target);
  return {
    id: rule.id,
    unlocked: unlockIndex !== -1,
    unlockedOn: records[unlockIndex]?.date ?? null,
    progress: rule.target === null ? null : { current: peak, target },
  };
}

export function evaluateBadges(
  records: readonly ActivityRecord[],
  restDates: ReadonlySet<string>,
): readonly BadgeState[] {
  const sorted = [...records].sort((a, b) => a.createdAt - b.createdAt);
  return RULES.map((rule) => evaluate(rule, sorted, restDates));
}

export function newlyUnlocked(
  before: readonly BadgeState[],
  after: readonly BadgeState[],
): readonly BadgeId[] {
  const wasUnlocked = new Set(before.filter((b) => b.unlocked).map((b) => b.id));
  return after.filter((b) => b.unlocked && !wasUnlocked.has(b.id)).map((b) => b.id);
}
