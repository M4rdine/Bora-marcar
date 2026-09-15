import { render } from '@testing-library/react-native';

import { LevelBar } from './LevelBar';
import { useReducedMotion } from './useReducedMotion';

jest.mock('./useReducedMotion', () => ({ useReducedMotion: jest.fn() }));

const mockedUseReducedMotion = useReducedMotion as jest.Mock;

describe('LevelBar', () => {
  it.each([true, false])(
    'renderiza os rótulos e a largura final do progresso (movimento reduzido = %s)',
    (reduced) => {
      mockedUseReducedMotion.mockReturnValue(reduced);
      const { getByText, getByTestId } = render(
        <LevelBar progress={0.42} left="Nível 3" right="120 XP" />,
      );
      expect(getByText('Nível 3')).toBeTruthy();
      expect(getByText('120 XP')).toBeTruthy();

      const fill = getByTestId('level-bar-fill');
      const flatStyle = Array.isArray(fill.props.style)
        ? Object.assign({}, ...fill.props.style.flat(Infinity).filter(Boolean))
        : fill.props.style;
      expect(flatStyle.width).toBe('42%');
    },
  );

  it('sem rótulos não renderiza a linha de labels', () => {
    mockedUseReducedMotion.mockReturnValue(true);
    const { queryByText } = render(<LevelBar progress={0.5} />);
    expect(queryByText('Nível 3')).toBeNull();
  });
});
