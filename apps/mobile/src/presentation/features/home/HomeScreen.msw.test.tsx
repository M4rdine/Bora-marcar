import { screen } from '@testing-library/react-native';
import { HttpResponse, http } from 'msw';

import { createAppServices } from '@/application/services';
import {
  fakeLocation,
  fixedClock,
  fixedConfig,
  memoryProgressRepository,
  recordingScheduler,
  saoPaulo,
  sequentialIds,
  silentLogger,
} from '@/application/testing/fakes';
import { createOpenMeteoForecast } from '@/infrastructure/openMeteo/forecastClient';
import { createOpenMeteoGeocoding } from '@/infrastructure/openMeteo/geocodingClient';

import { usePreferences } from '../../state/preferencesStore';
import { server } from '../../testing/msw/server';
import { renderWithProviders } from '../../testing/renderWithProviders';

import { HomeScreen } from './HomeScreen';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

// Fixture real (`daily.time[0] === '2026-09-14'`): 17:00Z = 14:00 em São Paulo no primeiro dia.
const FIXTURE_FIRST_DAY_14H_SP = Date.UTC(2026, 8, 14, 17, 0, 0);

function realServices() {
  const fetchFn: typeof fetch = (url, init) => fetch(url, init);
  return createAppServices({
    geocoding: createOpenMeteoGeocoding({ fetchFn }),
    forecast: createOpenMeteoForecast({ fetchFn }),
    location: fakeLocation(),
    progress: memoryProgressRepository(),
    config: fixedConfig(),
    clock: fixedClock(FIXTURE_FIRST_DAY_14H_SP),
    ids: sequentialIds(),
    notifications: recordingScheduler(),
    logger: silentLogger(),
  });
}

beforeEach(() => {
  usePreferences.setState({ city: saoPaulo, activity: 'walk', favorites: [], recents: [] });
});

describe('HomeScreen (MSW + adapters reais)', () => {
  it('busca a previsão real via HTTP e mostra a janela de hoje e a lista horária', async () => {
    renderWithProviders(<HomeScreen />, { services: realServices() });

    // Fixture real e chuvosa: às 14h a janela boa de caminhada de hoje já passou, então o herói
    // convida a registrar em vez de mostrar uma janela futura (mesmo comportamento coberto com
    // fakes em `HomeScreen.test.tsx`). A prova de que o HTTP real chegou até a tela é a janela
    // aparecendo nos "Próximos dias", calculada a partir do DTO parseado dos adapters reais.
    await screen.findByText('Seu dia, hora a hora', {}, { timeout: 5000 });
    expect(screen.getAllByText(/\d+h – \d+h/).length).toBeGreaterThan(0);
  });

  it('erro HTTP do serviço de previsão mostra mensagem e botão de tentar de novo', async () => {
    server.use(
      http.get('https://api.open-meteo.com/v1/forecast', () =>
        HttpResponse.json({}, { status: 503 }),
      ),
    );

    renderWithProviders(<HomeScreen />, { services: realServices() });

    await screen.findByText('O serviço de previsão respondeu com erro.', {}, { timeout: 5000 });
    expect(screen.getByText('Tentar de novo')).toBeTruthy();
  });

  it('resposta fora do schema mostra mensagem de resposta inesperada', async () => {
    server.use(
      http.get('https://api.open-meteo.com/v1/forecast', () =>
        HttpResponse.json({ timezone: 'x' }),
      ),
    );

    renderWithProviders(<HomeScreen />, { services: realServices() });

    await screen.findByText('Resposta inesperada do serviço de previsão.', {}, { timeout: 5000 });
  });
});
