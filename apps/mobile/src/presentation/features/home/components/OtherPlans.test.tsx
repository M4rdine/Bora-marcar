import { render, screen, fireEvent } from '@testing-library/react-native';

import { defaultEngineConfig as cfg, type ActivePlan } from '@/domain';

import { OtherPlans } from './OtherPlans';

const plano = (activity: ActivePlan['activity'], startHour: number): ActivePlan => ({
  planId: `p-${activity}`,
  cityId: 'sp',
  activity,
  date: '2026-09-13',
  window: { date: '2026-09-13', startHour, endHour: startHour + 2 },
  windowScore: 80,
});

describe('OtherPlans', () => {
  it('não mostra nada quando o único plano é o da atividade selecionada', () => {
    render(
      <OtherPlans
        plans={[plano('run', 18)]}
        selected="run"
        config={cfg}
        onSelect={() => undefined}
      />,
    );
    expect(screen.queryByText(/às 18h/)).toBeNull();
  });

  /**
   * O que a faixa existe para impedir: marcar ciclismo, olhar corrida, e o ciclismo sumir da tela
   * como se o app tivesse perdido o plano.
   */
  it('mostra o plano da outra atividade', () => {
    render(
      <OtherPlans
        plans={[plano('cycle', 8)]}
        selected="run"
        config={cfg}
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByText(`${cfg.activities.cycle.name} às 8h`)).toBeTruthy();
  });

  it('tocar leva para a atividade daquele plano', () => {
    const onSelect = jest.fn();
    render(
      <OtherPlans plans={[plano('cycle', 8)]} selected="run" config={cfg} onSelect={onSelect} />,
    );
    fireEvent.press(screen.getByText(`${cfg.activities.cycle.name} às 8h`));
    expect(onSelect).toHaveBeenCalledWith('cycle');
  });

  it('lista todos os outros, não só o primeiro', () => {
    render(
      <OtherPlans
        plans={[plano('cycle', 8), plano('walk', 12), plano('run', 18)]}
        selected="run"
        config={cfg}
        onSelect={() => undefined}
      />,
    );
    expect(screen.getByText(`${cfg.activities.cycle.name} às 8h`)).toBeTruthy();
    expect(screen.getByText(`${cfg.activities.walk.name} às 12h`)).toBeTruthy();
    expect(screen.queryByText(`${cfg.activities.run.name} às 18h`)).toBeNull();
  });

  it('sem planos, não ocupa espaço', () => {
    const { toJSON } = render(
      <OtherPlans plans={[]} selected="run" config={cfg} onSelect={() => undefined} />,
    );
    expect(toJSON()).toBeNull();
  });
});
