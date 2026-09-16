import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import {
  fakeForecast,
  fakeServices,
  memoryProgressRepository,
  saoPaulo,
} from '@/application/testing/fakes';
import { ok } from '@/domain';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';

import { usePreferences } from '../../state/preferencesStore';
import { renderWithProviders } from '../../testing/renderWithProviders';

import { DayScreen } from './DayScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockDate = '2026-09-14';
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ date: mockDate }),
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
}));

const DATES = ['2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17'];

beforeEach(() => {
  usePreferences.setState({ city: saoPaulo, activity: 'walk', favorites: [], recents: [] });
  mockBack.mockClear();
  mockReplace.mockClear();
});

describe('DayScreen', () => {
  it('amanhã com janela boa permite planejar e depois desfazer', async () => {
    mockDate = '2026-09-14';
    const progress = memoryProgressRepository();
    renderWithProviders(<DayScreen />, {
      services: fakeServices({ progress, forecast: fakeForecast(ok(makeForecast(DATES))) }),
    });
    await screen.findByText('Amanhã');
    expect(screen.getByText(/6h – 9h/)).toBeTruthy();
    // fora de hoje o kicker não pode dizer "hoje".
    expect(screen.getByText('Melhor horário')).toBeTruthy();
    expect(screen.queryByText('Melhor horário hoje')).toBeNull();
    fireEvent.press(screen.getByText('Planejar Caminhada às 6h'));
    await waitFor(() =>
      expect(progress.events().some((e) => e.type === 'planned' && e.date === '2026-09-14')).toBe(
        true,
      ),
    );
    await screen.findByText('Desfazer plano');
  });

  it('amanhã sem janela boa não diz "hoje" nem promete folga de sequência', async () => {
    mockDate = '2026-09-14';
    renderWithProviders(<DayScreen />, {
      services: fakeServices({
        forecast: fakeForecast(
          ok(
            makeForecast(DATES, (date) =>
              date === '2026-09-14' ? { precipitationProbability: 95, precipitationMm: 2 } : {},
            ),
          ),
        ),
      }),
    });
    await screen.findByText('Sem janela boa');
    expect(screen.getByText('Motivo principal: chuva.')).toBeTruthy();
    expect(screen.queryByText('Sem janela boa hoje')).toBeNull();
    expect(screen.queryByText('Hoje não conta contra a sua sequência.')).toBeNull();
  });

  it('depois de amanhã é somente visualização, sem botão de planejar', async () => {
    mockDate = '2026-09-15';
    renderWithProviders(<DayScreen />, {
      services: fakeServices({ forecast: fakeForecast(ok(makeForecast(DATES))) }),
    });
    await screen.findByText('Planejamento disponível só para amanhã');
    expect(screen.queryByText(/Planejar/)).toBeNull();
  });

  it('a cronologia lista as 24 horas do dia, sem cabeçalho de dia e sem marcar "agora"', async () => {
    mockDate = '2026-09-14';
    renderWithProviders(<DayScreen />, {
      services: fakeServices({ forecast: fakeForecast(ok(makeForecast(DATES))) }),
    });
    await screen.findByText('Hora a hora');
    const chronology = screen.getByLabelText('cronologia');
    // um dia tem 24 horas e nenhuma delas é "agora" numa tela de dia futuro.
    expect(within(chronology).getAllByRole('button')).toHaveLength(24);
    expect(within(chronology).queryByText('agora')).toBeNull();
    // o rótulo de cada hora nomeia o dia visitado, não "Hoje".
    expect(screen.getByLabelText(/^Amanhã, 0h, /)).toBeTruthy();
    expect(screen.getByLabelText(/^Amanhã, 23h, /)).toBeTruthy();
  });

  it('amanhã: escolher uma hora na cronologia planeja naquela hora', async () => {
    mockDate = '2026-09-14';
    const progress = memoryProgressRepository();
    renderWithProviders(<DayScreen />, {
      services: fakeServices({ progress, forecast: fakeForecast(ok(makeForecast(DATES))) }),
    });
    await screen.findByText('Hora a hora');
    fireEvent.press(screen.getByLabelText(/^Amanhã, 15h, /));
    fireEvent.press(await screen.findByText('Planejar Caminhada às 15h'));
    await waitFor(() =>
      expect(progress.events().some((e) => e.type === 'planned' && e.window.startHour === 15)).toBe(
        true,
      ),
    );
  });

  it('depois de amanhã a cronologia explica a nota mas não oferece plano', async () => {
    mockDate = '2026-09-15';
    renderWithProviders(<DayScreen />, {
      services: fakeServices({ forecast: fakeForecast(ok(makeForecast(DATES))) }),
    });
    await screen.findByText('Hora a hora');
    fireEvent.press(screen.getByLabelText(/, 15h, /));
    await screen.findByText('Por que esta nota');
    expect(screen.queryByText(/^Planejar/)).toBeNull();
  });

  it('dia fora da previsão mostra aviso e botão de voltar', async () => {
    mockDate = '2026-09-30';
    renderWithProviders(<DayScreen />, {
      services: fakeServices({ forecast: fakeForecast(ok(makeForecast(DATES))) }),
    });
    await screen.findByText('Dia fora da previsão');
    fireEvent.press(screen.getByText('Voltar'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('hoje redireciona para a Home', async () => {
    mockDate = '2026-09-13';
    renderWithProviders(<DayScreen />, {
      services: fakeServices({ forecast: fakeForecast(ok(makeForecast(DATES))) }),
    });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });
});
