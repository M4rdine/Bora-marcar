import { fireEvent, screen, waitFor } from '@testing-library/react-native';

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
    fireEvent.press(screen.getByText('Planejar Caminhada às 6h'));
    await waitFor(() =>
      expect(progress.events().some((e) => e.type === 'planned' && e.date === '2026-09-14')).toBe(
        true,
      ),
    );
    await screen.findByText('Desfazer plano');
  });

  it('depois de amanhã é somente visualização, sem botão de planejar', async () => {
    mockDate = '2026-09-15';
    renderWithProviders(<DayScreen />, {
      services: fakeServices({ forecast: fakeForecast(ok(makeForecast(DATES))) }),
    });
    await screen.findByText('Planejamento disponível só para amanhã');
    expect(screen.queryByText(/Planejar/)).toBeNull();
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
