import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Reveal } from './Reveal';
import { useReducedMotion } from './useReducedMotion';

jest.mock('./useReducedMotion', () => ({ useReducedMotion: jest.fn() }));

const mockedUseReducedMotion = useReducedMotion as jest.Mock;

describe('Reveal', () => {
  it.each([true, false])('renderiza os filhos com movimento reduzido = %s', (reduced) => {
    mockedUseReducedMotion.mockReturnValue(reduced);
    const { getByText } = render(
      <Reveal>
        <Text>Conquista desbloqueada</Text>
      </Reveal>,
    );
    expect(getByText('Conquista desbloqueada')).toBeTruthy();
  });
});
