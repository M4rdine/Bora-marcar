import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { deriveProgress, planFor } from './deriveProgress';
import { badDay, cancelled, confirmed, logged, loggedRun, planned } from './testing/fixtures';

const TODAY = '2026-09-13';

describe('deriveProgress', () => {
  it('vazio', () => {
    const p = deriveProgress([], cfg, TODAY);
    expect(p).toMatchObject({
      totalXp: 0,
      streak: 0,
      records: [],
      citiesCount: 0,
      todayPlans: [],
      todayRecord: null,
    });
    expect(p.level.level).toBe(1);
    expect(p.badges).toHaveLength(8);
  });

  it('plano confirmado dentro da janela: plano cumprido, XP do exemplo do spec', () => {
    const plan = planned(TODAY, { startHour: 17 });
    const events = [
      ...loggedRun('2026-09-12', 6),
      plan,
      confirmed(plan, { hourLeft: 17, hourScore: 86 }),
    ];
    const p = deriveProgress(events, cfg, TODAY);
    expect(p.streak).toBe(7);
    expect(p.todayRecord).toMatchObject({
      planFulfilled: true,
      streakDays: 7,
      activity: 'run',
      cityId: 'sp',
    });
    expect(p.todayRecord?.xp).toEqual({
      base: 50,
      hourBonus: 43,
      planBonus: 25,
      streakBonus: 35,
      total: 153,
    });
    expect(p.todayPlans).toHaveLength(0);
  });

  it('confirmação até 2h após o fim ainda cumpre o plano; depois disso não', () => {
    const p1 = planned(TODAY, { startHour: 17, endHour: 19 });
    const p2 = planned('2026-09-12', { startHour: 17, endHour: 19 });
    const p = deriveProgress(
      [p1, confirmed(p1, { hourLeft: 20 }), p2, confirmed(p2, { hourLeft: 21 })],
      cfg,
      TODAY,
    );
    expect(p.records.find((r) => r.date === TODAY)?.planFulfilled).toBe(true);
    expect(p.records.find((r) => r.date === '2026-09-12')?.planFulfilled).toBe(false);
  });

  /**
   * A segunda atividade do dia rende XP — sair duas vezes é melhor que sair uma. O que ela não
   * rende é o bônus de SEQUÊNCIA, que é por dia e já foi creditado na primeira. Antes o segundo
   * registro vinha com XP zero, o que fazia de "quero sair de novo" uma punição.
   */
  it('a segunda atividade do dia rende XP, menos o bônus de sequência', () => {
    const p = deriveProgress(
      [
        logged(TODAY, { hourLeft: 8, hourScore: 60 }),
        logged(TODAY, { hourLeft: 18, hourScore: 100 }),
      ],
      cfg,
      TODAY,
    );
    expect(p.records).toHaveLength(2);
    expect(p.records[0]?.hourScore).toBe(60);
    expect(p.records[0]?.xp.total).toBe(50 + 30 + 5);
    expect(p.records[1]?.xp).toEqual({
      base: 50,
      hourBonus: 50,
      planBonus: 0,
      streakBonus: 0,
      total: 100,
    });
    expect(p.totalXp).toBe(185);
    // O herói mostra o recibo do que ACABOU de acontecer, então é o último registro do dia.
    expect(p.todayRecord?.hourScore).toBe(100);
    expect(p.todayCount).toBe(2);
  });

  it('plano pendente de hoje é o não cancelado e não confirmado', () => {
    const plan = planned(TODAY);
    expect(deriveProgress([plan], cfg, TODAY).todayPlans[0]).toMatchObject({
      planId: plan.id,
      date: TODAY,
      window: plan.window,
    });
    expect(deriveProgress([plan, cancelled(plan)], cfg, TODAY).todayPlans).toHaveLength(0);
    expect(deriveProgress([planned('2026-09-12')], cfg, TODAY).todayPlans).toHaveLength(0);
  });

  /**
   * O plano é por atividade, não por dia. Pedalar de manhã e correr à tarde é um dia comum, e
   * antes o segundo plano simplesmente substituía o primeiro na leitura.
   */
  it('o mesmo dia comporta um plano por atividade', () => {
    const bike = planned(TODAY, { activity: 'cycle', startHour: 8 });
    const run = planned(TODAY, { activity: 'run', startHour: 18 });
    const p = deriveProgress([bike, run], cfg, TODAY);
    expect(p.todayPlans).toHaveLength(2);
    expect(planFor(p.todayPlans, 'cycle')?.window.startHour).toBe(8);
    expect(planFor(p.todayPlans, 'run')?.window.startHour).toBe(18);
    expect(planFor(p.todayPlans, 'walk')).toBeNull();
  });

  it('replanejar a MESMA atividade substitui, não soma', () => {
    const cedo = planned(TODAY, { activity: 'run', startHour: 8 });
    const tarde = planned(TODAY, { activity: 'run', startHour: 18 });
    const p = deriveProgress([cedo, tarde], cfg, TODAY);
    expect(p.todayPlans).toHaveLength(1);
    expect(planFor(p.todayPlans, 'run')?.window.startHour).toBe(18);
  });

  it('confirmação de plano inexistente ou cancelado é ignorada', () => {
    const plan = planned(TODAY);
    const orphan = { ...confirmed(plan), planId: 'nao-existe' };
    expect(deriveProgress([orphan], cfg, TODAY).records).toEqual([]);
    expect(deriveProgress([plan, cancelled(plan), confirmed(plan)], cfg, TODAY).records).toEqual(
      [],
    );
  });

  it('folga por mau tempo entra em restDates e preserva o streak', () => {
    const p = deriveProgress([...loggedRun('2026-09-11', 2), badDay('2026-09-12')], cfg, TODAY);
    expect(p.restDates.has('2026-09-12')).toBe(true);
    expect(p.streak).toBe(2);
  });

  it('XP acumula, nível deriva do total e cidades são contadas', () => {
    const events = [
      logged('2026-09-10', { cityId: 'a', hourScore: 100 }),
      logged('2026-09-11', { cityId: 'b', hourScore: 100 }),
    ];
    const p = deriveProgress(events, cfg, TODAY);
    // dia 1: 50 + 50 + 5 = 105; dia 2: 50 + 50 + 10 = 110
    expect(p.totalXp).toBe(215);
    expect(p.level).toMatchObject({ level: 2, name: 'Garoa' });
    expect(p.citiesCount).toBe(2);
    expect([...p.activeDates].sort()).toEqual(['2026-09-10', '2026-09-11']);
  });

  it('ordena por createdAt mesmo se os eventos vierem fora de ordem', () => {
    const a = logged('2026-09-10');
    const b = logged('2026-09-11');
    expect(deriveProgress([b, a], cfg, TODAY).records.map((r) => r.date)).toEqual([
      '2026-09-10',
      '2026-09-11',
    ]);
  });

  it('confirmação em data diferente do plano não cumpre o plano', () => {
    const plan = planned('2026-09-12', { startHour: 17, endHour: 19 });
    const late = { ...confirmed(plan, { hourLeft: 17 }), date: TODAY };
    const p = deriveProgress([plan, late], cfg, TODAY);
    expect(p.records).toHaveLength(1);
    expect(p.records[0]?.planFulfilled).toBe(false);
    expect(p.records[0]?.date).toBe(TODAY);
  });

  it('plansByDate expõe os planos pendentes de cada data, e todayPlans os de hoje', () => {
    const today = planned(TODAY, { startHour: 17 });
    const tomorrow = planned('2026-09-14', { startHour: 7 });
    const cancelledPlan = planned('2026-09-15', { startHour: 9 });
    const p = deriveProgress(
      [today, tomorrow, cancelledPlan, cancelled(cancelledPlan)],
      cfg,
      TODAY,
    );
    expect([...p.plansByDate.keys()].sort()).toEqual([TODAY, '2026-09-14']);
    expect(p.plansByDate.get('2026-09-14')?.[0]?.window.startHour).toBe(7);
    expect(p.todayPlans[0]?.planId).toBe(today.id);
  });

  it('plano confirmado sai de plansByDate', () => {
    const plan = planned(TODAY, { startHour: 17 });
    const p = deriveProgress([plan, confirmed(plan)], cfg, TODAY);
    expect(p.plansByDate.size).toBe(0);
  });

  it('minuteLeft entra no registro e vale 0 quando ausente', () => {
    const plan = planned(TODAY, { startHour: 17 });
    const p = deriveProgress(
      [plan, confirmed(plan, { hourLeft: 17, minuteLeft: 42 }), logged('2026-09-12')],
      cfg,
      TODAY,
    );
    expect(p.records.find((r) => r.date === TODAY)?.minuteLeft).toBe(42);
    expect(p.records.find((r) => r.date === '2026-09-12')?.minuteLeft).toBe(0);
  });
});
