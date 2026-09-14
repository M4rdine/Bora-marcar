import { screen } from '@testing-library/react-native';

import { fakeServices, memoryProgressRepository, saoPaulo } from '@/application/testing/fakes';

import { usePreferences } from '../../state/preferencesStore';
import { renderWithProviders } from '../../testing/renderWithProviders';

import { ProfileScreen } from './ProfileScreen';

describe('ProfileScreen', () => {
  it('mostra nível, números, conquistas e histórico', async () => {
    usePreferences.setState({ city: saoPaulo });
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
    await screen.findByText('Nível 2 · Garoa');
    expect(screen.getByText(/2 dias seguidos · 2 atividades · 2 cidades/)).toBeTruthy();
    expect(screen.getByText(/🏅 Primeira saída/)).toBeTruthy();
    expect(screen.getByText(/🏅 Madrugador/)).toBeTruthy();
    expect(screen.getByText(/🔒 Explorador \(2\/5\)/)).toBeTruthy();
    expect(screen.getByText('2026-09-13 · Corrida · 18h · +100 XP')).toBeTruthy();
  });

  it('sem registros mostra o vazio', async () => {
    renderWithProviders(<ProfileScreen />, { services: fakeServices() });
    await screen.findByText('Nenhuma atividade ainda.');
  });
});
