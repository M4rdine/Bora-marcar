import type { DayRecommendation } from '@/domain';

export type TomorrowShortcut = {
  readonly startHour: number;
  readonly endHour: number;
  readonly score: number;
};

/**
 * Janela boa de amanhã, base dos atalhos "Amanhã: …" e "Planejar amanhã às …" do herói. `null`
 * quando a previsão acaba hoje ou quando amanhã também não tem janela — nesses casos não há
 * atalho para oferecer.
 */
export function tomorrowShortcut(tomorrow: DayRecommendation | null): TomorrowShortcut | null {
  if (tomorrow === null || tomorrow.result.kind !== 'window') return null;
  const { window, score } = tomorrow.result;
  return { startHour: window.startHour, endHour: window.endHour, score };
}
