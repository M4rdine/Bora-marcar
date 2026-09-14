import { fireEvent, render, screen } from '@testing-library/react-native';

import { defaultEngineConfig, recommendDay, type DayRecommendation } from '@/domain';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';

import { NextDaysList } from './NextDaysList';

const DATES = ['2026-09-13', '2026-09-14', '2026-09-15'];
const forecast = makeForecast(DATES);
const profile = defaultEngineConfig.activities.walk;

const dayFor = (date: string): DayRecommendation =>
  recommendDay(forecast, profile, defaultEngineConfig, { date });

const baseProps = {
  today: '2026-09-13',
  tomorrow: '2026-09-14',
  onOpenDay: jest.fn(),
};

describe('NextDaysList', () => {
  it('mostra o glifo normal quando há resumo diário e o de fallback quando não há', () => {
    const withDaily = dayFor('2026-09-14');
    // `daily` pode faltar (ex.: previsão sem resumo para aquele dia) — a lista cai no
    // fallback `weatherGlyph(-1)` em vez de acessar `daily.weatherCode`.
    const withoutDaily: DayRecommendation = { ...dayFor('2026-09-15'), daily: null };
    render(
      <NextDaysList
        {...baseProps}
        days={[withDaily, withoutDaily]}
        comparison={null}
        bestDate={null}
      />,
    );
    // weatherCode 1 (fixture padrão) → 'poucas nuvens'.
    expect(screen.getByText(/poucas nuvens/)).toBeTruthy();
    expect(screen.getByText(/sem dados/)).toBeTruthy();
  });

  it('mostra o comparativo "amanhã é melhor" quando comparison é tomorrowBetter', () => {
    render(
      <NextDaysList
        {...baseProps}
        days={[dayFor('2026-09-14')]}
        comparison="tomorrowBetter"
        bestDate={null}
      />,
    );
    expect(screen.getByText('Amanhã é melhor que hoje')).toBeTruthy();
  });

  it('mostra o comparativo "hoje é o melhor" quando comparison é todayBestOfWeek', () => {
    render(
      <NextDaysList
        {...baseProps}
        days={[dayFor('2026-09-14')]}
        comparison="todayBestOfWeek"
        bestDate={null}
      />,
    );
    expect(screen.getByText('Hoje é o melhor dia da semana')).toBeTruthy();
  });

  it('não mostra comparativo quando comparison é null', () => {
    render(
      <NextDaysList
        {...baseProps}
        days={[dayFor('2026-09-14')]}
        comparison={null}
        bestDate={null}
      />,
    );
    expect(screen.queryByText('Amanhã é melhor que hoje')).toBeNull();
    expect(screen.queryByText('Hoje é o melhor dia da semana')).toBeNull();
  });

  it('marca só o dia de bestDate com o kicker "melhor da semana"', () => {
    const best = dayFor('2026-09-14');
    const other = dayFor('2026-09-15');
    render(
      <NextDaysList {...baseProps} days={[best, other]} comparison={null} bestDate={best.date} />,
    );
    expect(screen.getAllByText('melhor da semana')).toHaveLength(1);
  });

  it('toca em uma linha e chama onOpenDay com a data do dia', () => {
    const day = dayFor('2026-09-14');
    const onOpenDay = jest.fn();
    render(
      <NextDaysList
        {...baseProps}
        days={[day]}
        comparison={null}
        bestDate={null}
        onOpenDay={onOpenDay}
      />,
    );
    fireEvent.press(screen.getByRole('button'));
    expect(onOpenDay).toHaveBeenCalledWith(day.date);
  });
});
