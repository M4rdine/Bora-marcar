import { fireEvent, render } from '@testing-library/react-native';

import { Button } from './Button';
import { Chip } from './Chip';
import { Emoji } from './Emoji';
import { Pill } from './Pill';
import { SectionHeader } from './SectionHeader';
import { Surface } from './Surface';
import { AppText } from './Text';

describe('AppText', () => {
  it.each(['display', 'xp', 'title', 'subtitle', 'body', 'small', 'micro', 'kicker'] as const)(
    'renderiza a variante %s',
    (variant) => {
      const { getByText } = render(<AppText variant={variant}>Texto {variant}</AppText>);
      expect(getByText(`Texto ${variant}`)).toBeTruthy();
    },
  );

  it.each(['default', 'muted', 'ink'] as const)('renderiza o tom %s', (tone) => {
    const { getByText } = render(<AppText tone={tone}>Tom {tone}</AppText>);
    expect(getByText(`Tom ${tone}`)).toBeTruthy();
  });

  it('aplica fontVariant tabular-nums quando tabular', () => {
    const { getByText } = render(<AppText tabular>123</AppText>);
    const node = getByText('123');
    const flatStyle = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style.flat(Infinity).filter(Boolean))
      : node.props.style;
    expect(flatStyle.fontVariant).toEqual(['tabular-nums']);
  });
});

describe('Surface', () => {
  it.each(['soft', 'strong', 'shade'] as const)('renderiza a força %s', (strength) => {
    const { getByText } = render(
      <Surface strength={strength}>
        <AppText>{`conteúdo ${strength}`}</AppText>
      </Surface>,
    );
    expect(getByText(`conteúdo ${strength}`)).toBeTruthy();
  });

  it('aplica padding e gap quando informados', () => {
    const { getByText } = render(
      <Surface padding={4} gap={2}>
        <AppText>conteúdo com espaçamento</AppText>
      </Surface>,
    );
    expect(getByText('conteúdo com espaçamento')).toBeTruthy();
  });
});

describe('Button', () => {
  it.each(['primary', 'mint', 'quiet'] as const)('renderiza o tipo %s', (kind) => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button label={`Ação ${kind}`} kind={kind} onPress={onPress} />);
    const button = getByRole('button', { name: `Ação ${kind}` });
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('não dispara onPress quando desabilitado', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button label="Desabilitado" onPress={onPress} disabled />);
    const button = getByRole('button', { name: 'Desabilitado' });
    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renderiza o subtext quando informado', () => {
    const { getByText } = render(
      <Button label="Planejar corrida" subtext="+50 XP base" onPress={jest.fn()} />,
    );
    expect(getByText('+50 XP base')).toBeTruthy();
  });
});

describe('Chip', () => {
  it('mostra o score quando ativo', () => {
    const { getByText, getByRole } = render(
      <Chip label="Corrida" icon="run" active score={84} onPress={jest.fn()} />,
    );
    expect(getByText('84')).toBeTruthy();
    expect(getByRole('button', { name: 'Corrida' }).props.accessibilityState.selected).toBe(true);
  });

  it('não mostra score quando inativo', () => {
    const { queryByText, getByRole } = render(
      <Chip label="Caminhada" active={false} onPress={jest.fn()} />,
    );
    expect(queryByText('84')).toBeNull();
    expect(getByRole('button', { name: 'Caminhada' }).props.accessibilityState.selected).toBe(
      false,
    );
  });
});

describe('Pill', () => {
  it.each(['great', 'good', 'fair', 'poor', 'neutral'] as const)('renderiza o tom %s', (tone) => {
    const { getByText } = render(<Pill label={`Rótulo ${tone}`} tone={tone} />);
    expect(getByText(`Rótulo ${tone}`)).toBeTruthy();
  });
});

describe('SectionHeader', () => {
  it('renderiza com aside', () => {
    const { getByText } = render(<SectionHeader title="Seu dia" aside="Agora: Bom · 62" />);
    expect(getByText('Seu dia')).toBeTruthy();
    expect(getByText('Agora: Bom · 62')).toBeTruthy();
  });

  it('renderiza sem aside', () => {
    const { getByText, queryByText } = render(<SectionHeader title="Próximos dias" />);
    expect(getByText('Próximos dias')).toBeTruthy();
    expect(queryByText('Agora: Bom · 62')).toBeNull();
  });
});

describe('Emoji', () => {
  it('expõe o accessibilityLabel', () => {
    const { getByLabelText } = render(<Emoji symbol="🌤" label="Parcialmente nublado" />);
    expect(getByLabelText('Parcialmente nublado')).toBeTruthy();
  });
});
