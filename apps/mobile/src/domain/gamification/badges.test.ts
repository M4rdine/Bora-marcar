import { ACTIVITY_IDS } from '../activities/types';
import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { evaluateBadges, newlyUnlocked, type BadgeState } from './badges';
import { deriveProgress } from './deriveProgress';
import { badDay, logged, loggedRun } from './testing/fixtures';

const badge = (states: readonly BadgeState[], id: string) => states.find((b) => b.id === id);
const recordsOf = (events: Parameters<typeof deriveProgress>[0], today: string) =>
  deriveProgress(events, cfg, today).records;

describe('evaluateBadges', () => {
  it('sem registros: tudo bloqueado, progresso zerado onde contável', () => {
    const b = evaluateBadges([], new Set());
    expect(b).toHaveLength(8);
    expect(b.every((x) => !x.unlocked)).toBe(true);
    expect(badge(b, 'explorer')?.progress).toEqual({ current: 0, target: 5 });
    expect(badge(b, 'planner')?.progress).toEqual({ current: 0, target: 10 });
    // Derivado de `ACTIVITY_IDS`: a meta acompanha o catálogo em vez de ficar cravada.
    expect(badge(b, 'multi')?.progress).toEqual({ current: 0, target: ACTIVITY_IDS.length });
    expect(badge(b, 'week')?.progress).toEqual({ current: 0, target: 7 });
    expect(badge(b, 'first')?.progress).toBeNull();
  });

  it('primeira saída desbloqueia na data do primeiro registro', () => {
    const r = recordsOf([logged('2026-09-10'), logged('2026-09-12')], '2026-09-13');
    expect(badge(evaluateBadges(r, new Set()), 'first')).toMatchObject({
      unlocked: true,
      unlockedOn: '2026-09-10',
    });
  });

  it('madrugador (< 7h) e coruja (>= 20h)', () => {
    const r = recordsOf(
      [logged('2026-09-10', { hourLeft: 6 }), logged('2026-09-11', { hourLeft: 20 })],
      '2026-09-13',
    );
    const b = evaluateBadges(r, new Set());
    expect(badge(b, 'early')).toMatchObject({ unlocked: true, unlockedOn: '2026-09-10' });
    expect(badge(b, 'owl')).toMatchObject({ unlocked: true, unlockedOn: '2026-09-11' });
  });

  it('explorador conta cidades distintas', () => {
    const cities = ['a', 'b', 'c', 'd', 'e'];
    const r = recordsOf(
      cities.map((cityId, i) => logged(`2026-09-0${i + 1}`, { cityId })),
      '2026-09-13',
    );
    const b = evaluateBadges(r, new Set());
    expect(badge(b, 'explorer')).toMatchObject({
      unlocked: true,
      unlockedOn: '2026-09-05',
      progress: { current: 5, target: 5 },
    });
    expect(badge(evaluateBadges(r.slice(0, 3), new Set()), 'explorer')).toMatchObject({
      unlocked: false,
      progress: { current: 3, target: 5 },
    });
  });

  it('multiatleta exige TODAS as atividades, e não um número fixo', () => {
    const r = recordsOf(
      ACTIVITY_IDS.map((activity, i) => logged(`2026-09-0${i + 1}`, { activity })),
      '2026-09-13',
    );
    expect(badge(evaluateBadges(r, new Set()), 'multi')?.unlocked).toBe(true);
    // Faltando uma, continua bloqueada — é isso que "todas" significa.
    const quaseTodas = recordsOf(
      ACTIVITY_IDS.slice(0, -1).map((activity, i) => logged(`2026-09-0${i + 1}`, { activity })),
      '2026-09-13',
    );
    expect(badge(evaluateBadges(quaseTodas, new Set()), 'multi')?.unlocked).toBe(false);
  });

  it('clima perfeito com score >= 95', () => {
    const r = recordsOf(
      [logged('2026-09-10', { hourScore: 94 }), logged('2026-09-11', { hourScore: 95 })],
      '2026-09-13',
    );
    expect(badge(evaluateBadges(r, new Set()), 'perfect')).toMatchObject({
      unlocked: true,
      unlockedOn: '2026-09-11',
    });
  });

  it('semana cheia com streak 7, respeitando folgas', () => {
    const events = [
      ...loggedRun('2026-09-09', 4),
      badDay('2026-09-10'),
      ...loggedRun('2026-09-13', 3),
    ];
    const r = recordsOf(events, '2026-09-13');
    const b = evaluateBadges(r, new Set(['2026-09-10']));
    expect(badge(b, 'week')).toMatchObject({
      unlocked: true,
      unlockedOn: '2026-09-13',
      progress: { current: 7, target: 7 },
    });
  });
});

describe('newlyUnlocked', () => {
  it('lista o que passou de bloqueado para desbloqueado', () => {
    const before = evaluateBadges([], new Set());
    const after = evaluateBadges(
      recordsOf([logged('2026-09-13', { hourLeft: 6 })], '2026-09-13'),
      new Set(),
    );
    expect(newlyUnlocked(before, after)).toEqual(['first', 'early']);
    expect(newlyUnlocked(after, after)).toEqual([]);
  });
});
