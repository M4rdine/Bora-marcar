import {
  defaultEngineConfig as cfg,
  deriveProgress,
  recommendDay,
  type LocalDateTime,
} from '@/domain';
import { badDay, confirmed, logged, planned } from '@/domain/gamification/testing/fixtures';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';

import { deriveHeroState } from './heroState';

const DATES = ['2026-09-13', '2026-09-14'];
const at = (hour: number, minute = 0): LocalDateTime => ({
  date: '2026-09-13',
  hour,
  minute,
  epochMs: 0,
  utcOffsetSeconds: -10800,
});
const today = (now: LocalDateTime, rainy = false) =>
  recommendDay(
    makeForecast(DATES, () => (rainy ? { precipitationProbability: 95 } : {})),
    cfg.activities.walk,
    cfg,
    { date: now.date, now },
  );
const beachToday = (now: LocalDateTime) =>
  recommendDay(makeForecast(DATES), cfg.activities.beach, cfg, { date: now.date, now });
const progressOf = (events: Parameters<typeof deriveProgress>[0]) =>
  deriveProgress(events, cfg, '2026-09-13');

describe('deriveHeroState', () => {
  it('sem plano e com janela → plan', () => {
    const now = at(8);
    const s = deriveHeroState({
      today: today(now),
      now,
      progress: progressOf([]),
      graceHours: 2,
      fairThreshold: cfg.scores.fair,
    });
    expect(s.kind).toBe('plan');
    expect(s.kind === 'plan' && s.window.startHour).toBe(8);
  });

  it('plano ativo antes da janela → planned; dentro da janela → confirm com score de agora', () => {
    const plan = planned('2026-09-13', { startHour: 17, endHour: 19 });
    const progress = progressOf([plan]);
    expect(
      deriveHeroState({
        today: today(at(8)),
        now: at(8),
        progress,
        graceHours: 2,
        fairThreshold: cfg.scores.fair,
      }).kind,
    ).toBe('planned');
    const s = deriveHeroState({
      today: today(at(17, 30)),
      now: at(17, 30),
      progress,
      graceHours: 2,
      fairThreshold: cfg.scores.fair,
    });
    expect(s).toMatchObject({ kind: 'confirm', nowScore: 100 });
  });

  it('registro de hoje → done', () => {
    const plan = planned('2026-09-13', { startHour: 17 });
    const s = deriveHeroState({
      today: today(at(20)),
      now: at(20),
      progress: progressOf([plan, confirmed(plan)]),
      graceHours: 2,
      fairThreshold: cfg.scores.fair,
    });
    expect(s.kind === 'done' && s.record.planFulfilled).toBe(true);
  });

  it('sem janela boa → noWindow, mesmo com dia de folga registrado', () => {
    const s = deriveHeroState({
      today: today(at(8), true),
      now: at(8),
      progress: progressOf([badDay('2026-09-13')]),
      graceHours: 2,
      fairThreshold: cfg.scores.fair,
    });
    expect(s.kind).toBe('noWindow');
  });

  it('plano cuja janela (com tolerância) já passou → logNoPlan com o plano expirado', () => {
    const plan = planned('2026-09-13', { startHour: 7, endHour: 9 });
    const s = deriveHeroState({
      today: today(at(15)),
      now: at(15),
      progress: progressOf([plan]),
      graceHours: 2,
      fairThreshold: cfg.scores.fair,
    });
    expect(s.kind).toBe('logNoPlan');
    expect(s.kind === 'logNoPlan' && s.expiredPlan?.window.startHour).toBe(7);
  });

  it('dia bom cujas horas boas já passaram → logNoPlan sem plano', () => {
    const now = at(20);
    const s = deriveHeroState({
      today: beachToday(now),
      now,
      progress: progressOf([]),
      graceHours: 2,
      fairThreshold: cfg.scores.fair,
    });
    expect(s.kind).toBe('logNoPlan');
    expect(s.kind === 'logNoPlan' && s.expiredPlan).toBeNull();
  });

  it('registro espontâneo também é done', () => {
    const s = deriveHeroState({
      today: today(at(20)),
      now: at(20),
      progress: progressOf([logged('2026-09-13')]),
      graceHours: 2,
      fairThreshold: cfg.scores.fair,
    });
    expect(s.kind).toBe('done');
  });
});
