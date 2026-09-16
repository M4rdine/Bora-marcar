import { render } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';

import { Sky } from './Sky';
import { tokens } from './tokens';

describe('Sky', () => {
  it('renderiza o filho e o gradiente da fase', () => {
    const { getByText, UNSAFE_getAllByType } = render(
      <Sky phase="day">
        <Text>Conteúdo</Text>
      </Sky>,
    );

    expect(getByText('Conteúdo')).toBeTruthy();
    expect(UNSAFE_getAllByType(LinearGradient).length).toBeGreaterThan(0);
  });

  it('troca de fase mantém o filho e as duas fases, mais o véu', () => {
    const { getByText, rerender, UNSAFE_getAllByType } = render(
      <Sky phase="day">
        <Text>Conteúdo</Text>
      </Sky>,
    );

    rerender(
      <Sky phase="night">
        <Text>Conteúdo</Text>
      </Sky>,
    );

    expect(getByText('Conteúdo')).toBeTruthy();
    const gradients = UNSAFE_getAllByType(LinearGradient);
    expect(gradients).toHaveLength(3);
    // O véu é o último: fica acima das duas fases, e por isso vale igual durante o crossfade.
    expect(gradients[gradients.length - 1]?.props.colors).toEqual(tokens.scrim);
  });

  it('o véu está presente já na primeira renderização, não só depois de trocar de fase', () => {
    const { UNSAFE_getAllByType } = render(
      <Sky phase="night">
        <Text>Conteúdo</Text>
      </Sky>,
    );
    const colors = UNSAFE_getAllByType(LinearGradient).map((g) => g.props.colors);
    expect(colors).toContainEqual(tokens.scrim);
  });
});
