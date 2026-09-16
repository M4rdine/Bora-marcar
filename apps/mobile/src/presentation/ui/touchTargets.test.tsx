import { render, screen } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';

import { saoPaulo } from '@/application/testing/fakes';

import { CityRow } from '../features/cities/components/CityRow';
import { SearchField } from '../features/cities/components/SearchField';

import { Chip } from './Chip';
import { tokens } from './tokens';

/**
 * Altura e largura mínimas declaradas por um controle. A caixa real pode ser maior por causa do
 * conteúdo; o que este teste garante é que ela nunca é MENOR que o mínimo da Apple.
 */
function minBoxOf(label: string): { readonly width: number; readonly height: number } {
  const style = StyleSheet.flatten(screen.getByLabelText(label).props.style) as ViewStyle;
  return {
    width: Number(style.minWidth ?? 0),
    height: Number(style.minHeight ?? 0),
  };
}

const MIN = tokens.size.minTouch;

describe('alvos de toque', () => {
  it('o mínimo declarado no design system é o da Apple', () => {
    expect(MIN).toBe(44);
  });

  it('chip de atividade e de hora tem altura mínima de alvo', () => {
    render(<Chip label="Corrida" onPress={() => undefined} />);
    expect(minBoxOf('Corrida').height).toBeGreaterThanOrEqual(MIN);
  });

  it('a estrela de favoritar tem caixa de alvo, não só o tamanho do glifo', () => {
    render(
      <CityRow
        city={saoPaulo}
        favorite={false}
        onSelect={() => undefined}
        onToggleFavorite={() => undefined}
      />,
    );
    const box = minBoxOf('Favoritar');
    expect(box.width).toBeGreaterThanOrEqual(MIN);
    expect(box.height).toBeGreaterThanOrEqual(MIN);
  });

  it('o botão de limpar a busca tem caixa de alvo', () => {
    render(<SearchField value="São" onChangeText={() => undefined} />);
    const box = minBoxOf('Limpar');
    expect(box.width).toBeGreaterThanOrEqual(MIN);
    expect(box.height).toBeGreaterThanOrEqual(MIN);
  });

  it('sem texto digitado não há botão de limpar para acertar por engano', () => {
    render(<SearchField value="" onChangeText={() => undefined} />);
    expect(screen.queryByLabelText('Limpar')).toBeNull();
  });
});
