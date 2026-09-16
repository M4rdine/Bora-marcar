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
    expect(screen.getByLabelText('Explorador: bloqueada, 2 de 5')).toBeTruthy();

    expect(screen.getByText('Corrida · 18h00')).toBeTruthy();
    expect(screen.getByText('+100 XP')).toBeTruthy();

    // o mês aparece duas vezes de propósito: título do calendário e capítulo do histórico.
    expect(screen.getAllByText('Setembro 2026')).toHaveLength(2);
    expect(screen.getByLabelText('13: hoje, atividade feita')).toBeTruthy();

    // os três placares: sequência, atividades e conquistas. A contagem de cidades saiu, porque
    // nada no app recompensa variar de cidade.
    expect(screen.getByLabelText('2 atividades')).toBeTruthy();
    // três desbloqueadas: primeira saída, madrugador (6h) e coruja (18h).
    expect(screen.getByLabelText('3 conquistas')).toBeTruthy();
    expect(screen.queryByLabelText(/cidades?$/)).toBeNull();

    // a fração "2/5" já aparece nas células bloqueadas com progresso; ao abrir o detalhe do
    // Explorador ela aparece de novo lá dentro.
    const beforeDetail = screen.getAllByText('2/5').length;
    fireEvent.press(screen.getByText('Explorador'));
    expect(screen.getAllByText('2/5')).toHaveLength(beforeDetail + 1);
    expect(screen.getByText('Registrou atividades em 5 cidades diferentes.')).toBeTruthy();
  });

  it('sem registros mostra o vazio', async () => {
    renderWithProviders(<ProfileScreen />, { services: fakeServices() });
    await screen.findByText('Nenhuma atividade ainda.');
  });
});
