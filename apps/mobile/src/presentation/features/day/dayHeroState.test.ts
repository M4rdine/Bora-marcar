import {
  defaultEngineConfig,
  recommendDay,
  type ActivePlan,
  type DayRecommendation,
} from '@/domain';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';

import { dayHeroState } from './dayHeroState';

const DATES = ['2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16'];
const forecast = makeForecast(DATES);
const profile = defaultEngineConfig.activities.walk;

const dayFor = (date: string): DayRecommendation =>
  recommendDay(forecast, profile, defaultEngineConfig, { date });

const basePlan: ActivePlan = {
  planId: 'p1',
  cityId: 'sp',
  activity: 'walk',
  date: '2026-09-14',
  window: { date: '2026-09-14', startHour: 6, endHour: 9 },
  windowScore: 90,
};

const TODAY = '2026-09-13';
const TOMORROW = '2026-09-14';

describe('dayHeroState', () => {
  it('amanhã com janela boa e sem plano vira "plan"', () => {
    const day = dayFor(TOMORROW);
    const state = dayHeroState({
      day,
      date: TOMORROW,
      today: TODAY,
      tomorrow: TOMORROW,
      plan: null,
    });
    expect(state).toEqual({
      kind: 'plan',
      day,
      window: expect.objectContaining({ date: TOMORROW }),
      score: expect.any(Number),
    });
  });

  it('amanhã com plano em plansByDate vira "planned"', () => {
    const day = dayFor(TOMORROW);
    const state = dayHeroState({
      day,
      date: TOMORROW,
      today: TODAY,
      tomorrow: TOMORROW,
      plan: basePlan,
    });
    expect(state).toEqual({ kind: 'planned', plan: basePlan });
  });

  it('depois de amanhã vira "viewOnly" mesmo com janela boa', () => {
    const dayAfterTomorrow = '2026-09-15';
    const day = dayFor(dayAfterTomorrow);
    const state = dayHeroState({
      day,
      date: dayAfterTomorrow,
      today: TODAY,
      tomorrow: TOMORROW,
      plan: null,
    });
    expect(state).toEqual({ kind: 'viewOnly' });
  });

  it('hoje vira "viewOnly" (a tela já redireciona para a Home antes)', () => {
    const day = dayFor(TODAY);
    const state = dayHeroState({ day, date: TODAY, today: TODAY, tomorrow: TOMORROW, plan: null });
    expect(state).toEqual({ kind: 'viewOnly' });
  });

  it('amanhã sem janela boa vira "noWindow"', () => {
    const rainyForecast = makeForecast(DATES, () => ({
      precipitationProbability: 95,
      precipitationMm: 2,
    }));
    const day = recommendDay(rainyForecast, profile, defaultEngineConfig, { date: TOMORROW });
    const state = dayHeroState({
      day,
      date: TOMORROW,
      today: TODAY,
      tomorrow: TOMORROW,
      plan: null,
    });
    expect(state).toEqual({ kind: 'noWindow', day });
  });
});
