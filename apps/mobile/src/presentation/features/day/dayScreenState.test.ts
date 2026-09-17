import { saoPaulo } from '@/application/testing/fakes';
import { buildOverview } from '@/application/useCases/buildOverview';
import { defaultEngineConfig, deriveProgress } from '@/domain';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';

import { dayScreenState } from './dayScreenState';

const DATES = ['2026-09-13', '2026-09-14', '2026-09-15'];
const TOMORROW = '2026-09-14';

/** Meio-dia de 13/09 em São Paulo, para o "agora" do resumo ser estável. */
const NOW_EPOCH = Date.UTC(2026, 8, 13, 15, 0, 0);

const snapshotWith = (perHour: Parameters<typeof makeForecast>[1]) =>
  buildOverview({
    forecast: makeForecast(DATES, perHour),
    activity: 'walk',
    config: defaultEngineConfig,
    nowEpochMs: NOW_EPOCH,
  });

const stateFor = (perHour: Parameters<typeof makeForecast>[1]) =>
  dayScreenState({
    city: saoPaulo,
    snapshot: snapshotWith(perHour),
    config: defaultEngineConfig,
    progress: deriveProgress([], defaultEngineConfig, '2026-09-13'),
    date: TOMORROW,
    isToday: false,
  });

describe('o céu da tela de um dia futuro', () => {
  it('mostra a hora da janela recomendada, não um meio-dia fixo', () => {
    // Manhã fria e tarde quente empurram a melhor janela para o começo do dia.
    const state = stateFor((_date, hour) =>
      hour !== undefined && hour < 10 ? { apparentTemperature: 21 } : { apparentTemperature: 34 },
    );
    expect(state.day?.result.kind).toBe('window');
    const startHour =
      state.day?.result.kind === 'window' ? state.day.result.window.startHour : null;
    expect(startHour).not.toBeNull();
    expect(startHour as number).toBeLessThan(10);
    // Com a janela de manhã cedo, o céu não pode ser o de meio-dia.
    expect(state.phase).not.toBe('day');
  });

  it('um dia inteiro ruim mostra o céu de chuva, e não o da melhor hora', () => {
    const state = stateFor(() => ({ precipitationProbability: 95, precipitationMm: 3 }));
    expect(state.phase).toBe('rainy');
  });

  it('sem previsão carregada, cai num padrão em vez de quebrar', () => {
    const state = dayScreenState({
      city: saoPaulo,
      snapshot: null,
      config: defaultEngineConfig,
      progress: deriveProgress([], defaultEngineConfig, '2026-09-13'),
      date: TOMORROW,
      isToday: false,
    });
    expect(state.phase).toBe('day');
    expect(state.ready).toBe(false);
  });

  it('a tela só fica pronta com cidade, previsão, config e progresso', () => {
    expect(stateFor(() => ({})).ready).toBe(true);
  });
});
