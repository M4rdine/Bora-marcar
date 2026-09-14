import { defaultEngineConfig } from '@/domain';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';

import { fixedClock } from '../testing/fakes';

import { buildOverview } from './buildOverview';

describe('buildOverview', () => {
  // 2026-09-13T17:00Z = 14:00 em São Paulo (UTC-3)
  const clock = fixedClock(Date.UTC(2026, 8, 13, 17, 0, 0));
  const forecast = makeForecast(['2026-09-13', '2026-09-14', '2026-09-15']);

  it('usa o fuso da cidade para o agora e monta a visão geral', () => {
    const { overview, now } = buildOverview({ clock })({
      forecast,
      activity: 'walk',
      config: defaultEngineConfig,
    });
    expect(now).toMatchObject({ date: '2026-09-13', hour: 14, minute: 0 });
    expect(overview.today.date).toBe('2026-09-13');
    expect(overview.today.result.kind === 'window' && overview.today.result.window.startHour).toBe(
      14,
    );
    expect(overview.nextDays.map((d) => d.date)).toEqual(['2026-09-14', '2026-09-15']);
  });

  it('muda com a atividade', () => {
    const walk = buildOverview({ clock })({
      forecast,
      activity: 'walk',
      config: defaultEngineConfig,
    });
    const beach = buildOverview({ clock })({
      forecast,
      activity: 'beach',
      config: defaultEngineConfig,
    });
    expect(walk.overview.today.activityId).toBe('walk');
    expect(beach.overview.today.activityId).toBe('beach');
  });
});
