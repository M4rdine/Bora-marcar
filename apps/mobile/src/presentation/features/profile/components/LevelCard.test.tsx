import { render, screen } from '@testing-library/react-native';

import { defaultEngineConfig, levelFor } from '@/domain';

import { LevelCard } from './LevelCard';

describe('LevelCard', () => {
  it('mostra "Nível máximo" quando não há próximo nível', () => {
    const level = levelFor(5000, defaultEngineConfig.levels);
    render(<LevelCard level={level} />);
    expect(screen.getByText('Nível máximo')).toBeTruthy();
  });
});
