import { act, render } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';

import { motion } from './motion';
import { Sky } from './Sky';
import { tokens } from './tokens';

// O `jest.setup.js` força movimento reduzido em toda a suíte para estabilizar as telas; este
// arquivo é o único que desliga esse padrão para exercitar o caminho animado do `Sky`.
jest.mock('./useReducedMotion', () => ({ useReducedMotion: () => false }));

const SETTLE_MS = 50;

describe('Sky com movimento ligado', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('faz o crossfade e adota a fase nova no gradiente de baixo ao terminar', () => {
    const { UNSAFE_getAllByType, getByText, rerender } = render(
      <Sky phase="day">
        <Text>Conteúdo</Text>
      </Sky>,
    );
    const colorsOfBottomGradient = () => UNSAFE_getAllByType(LinearGradient)[0]?.props.colors;
    expect(colorsOfBottomGradient()).toEqual(tokens.gradients.day);

    rerender(
      <Sky phase="night">
        <Text>Conteúdo</Text>
      </Sky>,
    );
    // Durante a transição o gradiente de baixo ainda é o anterior (dia) e o de cima entra em fade.
    expect(UNSAFE_getAllByType(LinearGradient)).toHaveLength(2);
    expect(colorsOfBottomGradient()).toEqual(tokens.gradients.day);

    act(() => {
      jest.advanceTimersByTime(motion.sky + SETTLE_MS);
    });

    // Fim da animação: o callback `runOnJS(setPrevious)` promoveu a noite a fase corrente.
    expect(colorsOfBottomGradient()).toEqual(tokens.gradients.night);
    expect(UNSAFE_getAllByType(LinearGradient)).toHaveLength(2);
    expect(getByText('Conteúdo')).toBeTruthy();
  });
});
