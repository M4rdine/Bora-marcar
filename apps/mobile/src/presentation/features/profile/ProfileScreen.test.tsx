import { fireEvent, screen } from '@testing-library/react-native';

import { fakeServices, memoryProgressRepository, saoPaulo } from '@/application/testing/fakes';

import { usePreferences } from '../../state/preferencesStore';
import { renderWithProviders } from '../../testing/renderWithProviders';

import { ProfileScreen } from './ProfileScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

beforeEach(() => {
  mockPush.mockClear();
});

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

    // a célula bloqueada mostra a fração curta; o detalhe abre com barra e o número por extenso,
    // que é o que faltava para a conquista parecer alcançável em vez de só enunciar o critério.
    expect(screen.getAllByText('2/5').length).toBeGreaterThan(0);
    expect(screen.queryByText('2 de 5')).toBeNull();
    // 'Explorador' agora aparece duas vezes: no destaque de próxima conquista e na grade.
    fireEvent.press(screen.getByLabelText('Explorador: bloqueada, 2 de 5'));
    expect(screen.getByText('2 de 5')).toBeTruthy();
    expect(screen.getByLabelText('Progresso: 2 de 5, 40%')).toBeTruthy();
    expect(screen.getByText('Registrou atividades em 5 cidades diferentes.')).toBeTruthy();
  });

  it('sem registros, convida a começar em vez de mostrar um painel de zeros', async () => {
    renderWithProviders(<ProfileScreen />, { services: fakeServices() });
    await screen.findByText('Sua coleção começa na primeira saída');
    // nada de painel zerado: sem calendário em branco, sem grade de medalhas, sem "0 XP".
    expect(screen.queryByText('Conquistas')).toBeNull();
    expect(screen.queryByText('Histórico')).toBeNull();
    expect(screen.queryByText(/^0 /)).toBeNull();
    // e há uma saída, que era o que faltava
    fireEvent.press(screen.getByText('Ver os horários de hoje'));
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('promove a conquista mais perto de sair acima da grade', async () => {
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
    // Explorador está em 2 de 5, a mais adiantada entre as bloqueadas com progresso.
    await screen.findByLabelText('Próxima conquista: Explorador, 2 de 5');
    expect(screen.getByText('Falta pouco')).toBeTruthy();
    expect(screen.getByText('Faltam 3 para desbloquear')).toBeTruthy();
  });
});
