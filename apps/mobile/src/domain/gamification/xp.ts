import type { XpRules } from '../config/types';

export type XpBreakdown = {
  readonly base: number;
  readonly hourBonus: number;
  readonly planBonus: number;
  readonly streakBonus: number;
  readonly total: number;
};

export type XpInput = {
  readonly hourScore: number;
  readonly planFulfilled: boolean;
  readonly streakDays: number;
};

export function computeXp(input: XpInput, rules: XpRules): XpBreakdown {
  const base = rules.base;
  const hourBonus = Math.round(input.hourScore / 2);
  const planBonus = input.planFulfilled ? rules.planBonus : 0;
  const streakBonus = rules.streakPerDay * Math.min(input.streakDays, rules.streakMaxDays);
  return {
    base,
    hourBonus,
    planBonus,
    streakBonus,
    total: base + hourBonus + planBonus + streakBonus,
  };
}
