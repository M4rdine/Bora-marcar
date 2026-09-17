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

  it('troca de fase mantém o filho e as duas fases', () => {
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
    // Sem véu: o céu é escuro por paleta, então só existem as duas camadas do crossfade.
    const colors = UNSAFE_getAllByType(LinearGradient).map((g) => g.props.colors);
    expect(colors).toHaveLength(2);
    expect(colors).toContainEqual(tokens.gradients.night);
  });
});
