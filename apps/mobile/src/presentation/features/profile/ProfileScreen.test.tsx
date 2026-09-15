import { fireEvent, screen } from '@testing-library/react-native';

import { fakeServices, memoryProgressRepository, saoPaulo } from '@/application/testing/fakes';

import { usePreferences } from '../../state/preferencesStore';
import { renderWithProviders } from '../../testing/renderWithProviders';

import { ProfileScreen } from './ProfileScreen';

describe('ProfileScreen', () => {
  it('mostra nível, números, calendário, conquistas e histórico', async () => {
    usePreferences.setState({
      city: saoPaulo,
      lastForecast: { utcOffsetSeconds: -10800, timezone: 'America/Sao_Paulo' },
    });
    const progress = memoryProgressRepository([
      {
        type: 'logged',
        id: 'a',
        cityId: 'sp',
        activity: 'walk',
        date: '2026-09-12',
        hourLeft: 6,
        hourScore: 100,
        createdAt: 1,
      },
      {
        type: 'logged',
        id: 'b',
        cityId: 'rj',
        activity: 'run',
        date: '2026-09-13',
        hourLeft: 18,
        hourScore: 80,
        createdAt: 2,
      },
    ]);
    renderWithProviders(<ProfileScreen />, { services: fakeServices({ progress }) });

    await screen.findByText(/Nível 2 · Garoa/);
    expect(screen.getByLabelText('2 dias seguidos')).toBeTruthy();
    expect(screen.getByText('dias seguidos')).toBeTruthy();

    expect(screen.getByLabelText('Primeira saída: desbloqueada')).toBeTruthy();
    expect(screen.getByLabelText('Madrugador: desbloqueada')).toBeTruthy();
    expect(screen.getByLabelText('Explorador: bloqueada')).toBeTruthy();

    expect(screen.getByText('Corrida · 18h00')).toBeTruthy();
    expect(screen.getByText('+100 XP')).toBeTruthy();

    expect(screen.getByText('Setembro 2026')).toBeTruthy();
    expect(screen.getByLabelText('13: hoje, atividade feita')).toBeTruthy();

    fireEvent.press(screen.getByText('Explorador'));
    expect(screen.getByText('2/5')).toBeTruthy();
    expect(screen.getByText('Registrou atividades em 5 cidades diferentes.')).toBeTruthy();
  });

  it('sem registros mostra o vazio', async () => {
    renderWithProviders(<ProfileScreen />, { services: fakeServices() });
    await screen.findByText('Nenhuma atividade ainda.');
  });
});
