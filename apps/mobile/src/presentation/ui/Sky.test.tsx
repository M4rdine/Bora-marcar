import { render } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';

import { Sky } from './Sky';

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

  it('troca de fase mantém o filho renderizado e dois gradientes presentes', () => {
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
    expect(UNSAFE_getAllByType(LinearGradient).length).toBe(2);
  });
});
