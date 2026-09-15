import { fireEvent, render, screen } from '@testing-library/react-native';

import type { BadgeState } from '@/domain';

import { BadgeGrid } from './BadgeGrid';

const lockedWithProgress: BadgeState = {
  id: 'explorer',
  unlocked: false,
  unlockedOn: null,
  progress: { current: 2, target: 5 },
};

const unlocked: BadgeState = {
  id: 'first',
  unlocked: true,
  unlockedOn: '2026-09-01',
  progress: null,
};

describe('BadgeGrid', () => {
  it('badge bloqueada com progresso mostra a fração e o rótulo de acessibilidade', () => {
    render(<BadgeGrid badges={[lockedWithProgress]} />);
    expect(screen.getByText('2/5')).toBeTruthy();
    expect(screen.getByLabelText('Explorador: bloqueada, 2 de 5')).toBeTruthy();
  });

  it('badge desbloqueada não mostra fração', () => {
    render(<BadgeGrid badges={[unlocked]} />);
    expect(screen.queryByText(/\d+\/\d+/)).toBeNull();
    expect(screen.getByLabelText('Primeira saída: desbloqueada')).toBeTruthy();
  });

  it('tocar duas vezes na mesma badge abre e fecha o detalhe', () => {
    render(<BadgeGrid badges={[lockedWithProgress]} />);
    const item = screen.getByLabelText('Explorador: bloqueada, 2 de 5');
    fireEvent.press(item);
    expect(screen.getByText('Registrou atividades em 5 cidades diferentes.')).toBeTruthy();
    fireEvent.press(item);
    expect(screen.queryByText('Registrou atividades em 5 cidades diferentes.')).toBeNull();
  });
});
