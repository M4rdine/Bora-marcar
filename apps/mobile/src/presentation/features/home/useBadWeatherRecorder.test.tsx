import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { fakeServices } from '@/application/testing/fakes';
import { defaultEngineConfig, recommendDay, type DayRecommendation } from '@/domain';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';

import { ServicesProvider } from '../../services/ServicesProvider';

import { useBadWeatherRecorder } from './useBadWeatherRecorder';

const CITY_ID = 'sp';
const FAIR_THRESHOLD = 45;

// Mesma fixture chuvosa usada em HomeScreen.test.tsx ("dia sem janela boa"): só 13/09 chove, o que
// deixa `bestScoreOfDay` baixo (20) para qualquer atividade nesse dia — o veto de chuva domina.
const DATES = ['2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17'];
const forecast = makeForecast(DATES, (date) =>
  date === '2026-09-13' ? { precipitationProbability: 95, precipitationMm: 2 } : {},
);

function dayRecommendation(date: string): DayRecommendation {
  return recommendDay(forecast, defaultEngineConfig.activities.walk, defaultEngineConfig, {
    date,
  });
}

function wrapperFor(services: ReturnType<typeof fakeServices>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ServicesProvider services={services}>{children}</ServicesProvider>;
  };
}

describe('useBadWeatherRecorder', () => {
  it('guarda por data: não repete a chamada quando outra dependência muda no mesmo dia, mas registra de novo em outro dia', async () => {
    const services = fakeServices();
    const recordBadWeatherDay = jest.spyOn(services, 'recordBadWeatherDay');
    const today13 = dayRecommendation('2026-09-13');
    expect(today13.hours.length).toBeGreaterThan(0);
    expect(today13.bestScoreOfDay).toBe(20); // abaixo do limiar "razoável" (45) → dia ruim

    const { rerender } = renderHook(
      ({
        today,
        fairThreshold,
      }: {
        today: DayRecommendation | null;
        fairThreshold: number | null;
      }) => useBadWeatherRecorder(CITY_ID, today, fairThreshold),
      {
        wrapper: wrapperFor(services),
        initialProps: { today: today13, fairThreshold: FAIR_THRESHOLD },
      },
    );

    // (1) primeira renderização: registra uma vez com os dados do dia.
    await waitFor(() => expect(recordBadWeatherDay).toHaveBeenCalledTimes(1));
    expect(recordBadWeatherDay).toHaveBeenCalledWith({
      cityId: CITY_ID,
      date: '2026-09-13',
      bestScore: 20,
    });

    // (2) novo objeto `today`, MESMA data, mas `bestScoreOfDay` diferente: isso muda uma
    // dependência do efeito (ele roda de novo), mas a guarda por data deve manter só 1 chamada.
    const today13WithDifferentScore: DayRecommendation = { ...today13, bestScoreOfDay: 25 };
    rerender({ today: today13WithDifferentScore, fairThreshold: FAIR_THRESHOLD });
    await waitFor(() => expect(recordBadWeatherDay).toHaveBeenCalledTimes(1));

    // (3) dia diferente: a guarda libera de novo, chamada nº 2.
    const today14: DayRecommendation = { ...today13WithDifferentScore, date: '2026-09-14' };
    rerender({ today: today14, fairThreshold: FAIR_THRESHOLD });
    await waitFor(() => expect(recordBadWeatherDay).toHaveBeenCalledTimes(2));
    expect(recordBadWeatherDay).toHaveBeenLastCalledWith({
      cityId: CITY_ID,
      date: '2026-09-14',
      bestScore: 25,
    });
  });

  it('sem limiar "razoável" (config ainda carregando) nunca registra', async () => {
    const services = fakeServices();
    const recordBadWeatherDay = jest.spyOn(services, 'recordBadWeatherDay');
    const today13 = dayRecommendation('2026-09-13');

    renderHook(() => useBadWeatherRecorder(CITY_ID, today13, null), {
      wrapper: wrapperFor(services),
    });

    // dá espaço para um efeito assíncrono indevido aparecer antes de afirmar que nunca chamou.
    await waitFor(() => expect(today13.bestScoreOfDay).toBe(20));
    expect(recordBadWeatherDay).not.toHaveBeenCalled();
  });
});
