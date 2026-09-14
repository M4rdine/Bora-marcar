import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import {
  fakeForecast,
  fakeServices,
  fixedClock,
  memoryProgressRepository,
  saoPaulo,
} from '@/application/testing/fakes';
import { err, ok } from '@/domain';
import { planned } from '@/domain/gamification/testing/fixtures';
import { makeForecast } from '@/domain/recommendation/testing/fixtures';

import { usePreferences } from '../../state/preferencesStore';
import { renderWithProviders } from '../../testing/renderWithProviders';

import { HomeScreen } from './HomeScreen';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

const DATES = ['2026-09-13', '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17'];
const goodServices = () => fakeServices({ forecast: fakeForecast(ok(makeForecast(DATES))) });

beforeEach(() =>
  usePreferences.setState({ city: null, activity: 'walk', favorites: [], recents: [] }),
);

describe('HomeScreen', () => {
  it('sem cidade mostra as boas-vindas', () => {
    renderWithProviders(<HomeScreen />, { services: goodServices() });
    expect(screen.getByText('A melhor hora para sair, em uma frase.')).toBeTruthy();
    expect(screen.getByText('Buscar cidade')).toBeTruthy();
  });

  it('com cidade mostra a janela de hoje e permite planejar e confirmar', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, { services: goodServices() });
    // relógio falso: 14:00 em São Paulo → janela 14h–17h
    await screen.findByText('14h – 17h', {}, { timeout: 3000 });
    expect(screen.getByText('Ótimo · 100')).toBeTruthy();
    fireEvent.press(screen.getByText('Planejar Caminhada às 14h'));
    // 14:00 está dentro da janela → estado "confirm"
    await screen.findByText('Confirmar que fui');
    fireEvent.press(screen.getByText('Confirmar que fui'));
    await screen.findByText('Concluído às 14h00');
    expect(screen.getByText('+130 XP')).toBeTruthy(); // 50 + 50 (score 100) + 25 (plano) + 5 (1 dia)
  });

  it('erro de rede mostra mensagem e botão de tentar de novo', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, {
      services: fakeServices({ forecast: fakeForecast(err({ code: 'network', message: 'x' })) }),
    });
    await screen.findByText('Sem conexão. Tente de novo.');
    expect(screen.getByText('Tentar de novo')).toBeTruthy();
  });

  it('lista as 24 horas e os próximos dias', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, { services: goodServices() });
    await screen.findByText('Seu dia, hora a hora');
    expect(screen.getByText('17h · 100 · Ótimo')).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/2026-09-14 · 6h – 9h · 100/)).toBeTruthy());
  });

  it('plano ativo antes da janela mostra Planejado e permite desfazer', async () => {
    usePreferences.setState({ city: saoPaulo });
    renderWithProviders(<HomeScreen />, {
      services: fakeServices({
        forecast: fakeForecast(ok(makeForecast(DATES))),
        progress: memoryProgressRepository([planned('2026-09-13', { startHour: 17, endHour: 19 })]),
        clock: fixedClock(Date.UTC(2026, 8, 13, 11, 0, 0)),
      }),
    });
    // 08:00 em São Paulo, antes da janela 17h–19h → estado "planned"
    await screen.findByText('Planejado para as 17h');
    fireEvent.press(screen.getByText('Desfazer plano'));
    // após desfazer, o herói volta ao estado "plan" recalculado a partir das 08:00
    await screen.findByText(/Planejar Caminhada às \d+h/);
  });

  it('dia sem janela boa mostra o motivo, permite registrar e marca o dia de folga', async () => {
    usePreferences.setState({ city: saoPaulo });
    const progress = memoryProgressRepository();
    renderWithProviders(<HomeScreen />, {
      services: fakeServices({
        progress,
        forecast: fakeForecast(
          ok(makeForecast(DATES, () => ({ precipitationProbability: 95, precipitationMm: 2 }))),
        ),
      }),
    });
    await screen.findByText('Sem janela boa hoje');
    expect(screen.getByText('Motivo principal: chuva.')).toBeTruthy();
    await waitFor(() =>
      expect(progress.events().filter((e) => e.type === 'badWeatherDay')).toHaveLength(1),
    );
    fireEvent.press(screen.getByText('Saí em outro horário'));
    await screen.findByText(/Concluído às 14h00/);
    expect(screen.getByText(/\+\d+ XP/)).toBeTruthy();
  });

  it('dia bom cujas horas boas já passaram convida a registrar, sem marcar folga', async () => {
    usePreferences.setState({ city: saoPaulo, activity: 'beach' });
    const progress = memoryProgressRepository();
    renderWithProviders(<HomeScreen />, {
      services: fakeServices({
        progress,
        forecast: fakeForecast(ok(makeForecast(DATES))),
        // 2026-09-13T23:00Z = 20:00 em São Paulo: as horas boas de praia já passaram.
        clock: fixedClock(Date.UTC(2026, 8, 13, 23, 0, 0)),
      }),
    });
    await screen.findByText('Sua janela de hoje já passou');
    fireEvent.press(screen.getByText('Registrar atividade'));
    await screen.findByText(/Concluído às 20h00/);
    expect(progress.events().some((e) => e.type === 'badWeatherDay')).toBe(false);
  });
});
