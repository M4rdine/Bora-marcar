import { defaultEngineConfig, recommendDay } from '@/domain';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';

import { tomorrowShortcut } from './tomorrowShortcut';

const DATE = '2026-09-14';

const dayWith = (perHour: Parameters<typeof makeForecast>[1]) =>
  recommendDay(
    makeForecast([DATE], perHour),
    defaultEngineConfig.activities.walk,
    defaultEngineConfig,
    { date: DATE },
  );

describe('tomorrowShortcut', () => {
  it('devolve a janela de amanhã quando ela existe', () => {
    expect(tomorrowShortcut(dayWith(undefined))).toEqual({
      startHour: 6,
      endHour: 9,
      score: 100,
    });
  });

  it('devolve null quando amanhã não tem janela boa', () => {
    const rainy = dayWith(() => ({ precipitationProbability: 95, precipitationMm: 2 }));
    expect(rainy.result.kind).toBe('none');
    expect(tomorrowShortcut(rainy)).toBeNull();
  });

  it('devolve null quando não há amanhã na previsão', () => {
    expect(tomorrowShortcut(null)).toBeNull();
  });
});
