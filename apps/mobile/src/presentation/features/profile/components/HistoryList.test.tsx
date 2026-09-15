import { render, screen } from '@testing-library/react-native';

import { defaultEngineConfig, deriveProgress, type GamificationEvent } from '@/domain';

import { HistoryList } from './HistoryList';

const CONFIG = defaultEngineConfig;

// `p1`/`c1` formam um plano cumprido: a confirmação (18h) cai dentro da janela 17h–19h
// (mais a folga de 2h de `graceHoursAfterEnd`), então `deriveProgress` marca `planFulfilled`.
const EVENTS: readonly GamificationEvent[] = [
  {
    type: 'planned',
    id: 'p1',
    cityId: 'sp',
    activity: 'walk',
    date: '2026-09-10',
    window: { date: '2026-09-10', startHour: 17, endHour: 19 },
    windowScore: 80,
    createdAt: 1,
  },
  {
    type: 'confirmed',
    id: 'c1',
    planId: 'p1',
    date: '2026-09-10',
    hourLeft: 18,
    hourScore: 85,
    createdAt: 2,
  },
  {
    type: 'logged',
    id: 'l1',
    cityId: 'rj',
    activity: 'run',
    date: '2026-09-13',
    hourLeft: 18,
    hourScore: 80,
    createdAt: 3,
  },
];

describe('HistoryList', () => {
  it('mostra "plano cumprido" só na linha do registro que cumpriu o plano', () => {
    const progress = deriveProgress(EVENTS, CONFIG, '2026-09-13');
    render(
      <HistoryList
        records={progress.records}
        today="2026-09-13"
        tomorrow="2026-09-14"
        config={CONFIG}
      />,
    );

    expect(screen.getAllByText('plano cumprido')).toHaveLength(1);
    expect(screen.getByText('Caminhada · 18h00')).toBeTruthy();
    expect(screen.getByText('Corrida · 18h00')).toBeTruthy();
  });
});
