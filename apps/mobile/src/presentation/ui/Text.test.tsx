import { render, screen } from '@testing-library/react-native';
import { StyleSheet, type TextStyle } from 'react-native';

import { AppText } from './Text';
import { tokens } from './tokens';

const styleOf = (label: string): TextStyle =>
  StyleSheet.flatten(screen.getByText(label).props.style) as TextStyle;

describe('AppText', () => {
  it('toda variante sai com uma família carregada, nunca com a fonte do sistema', () => {
    render(
      <>
        <AppText variant="display">display</AppText>
        <AppText variant="xp">xp</AppText>
        <AppText variant="title">title</AppText>
        <AppText variant="subtitle">subtitle</AppText>
        <AppText variant="body">body</AppText>
        <AppText variant="small">small</AppText>
        <AppText variant="micro">micro</AppText>
        <AppText variant="kicker">kicker</AppText>
      </>,
    );
    for (const label of [
      'display',
      'xp',
      'title',
      'subtitle',
      'body',
      'small',
      'micro',
      'kicker',
    ]) {
      expect(styleOf(label).fontFamily).toMatch(/^(Archivo|Manrope)_/);
    }
  });

  it('os tamanhos grandes falam com a display e o texto miúdo com a de leitura', () => {
    render(
      <>
        <AppText variant="display">grande</AppText>
        <AppText variant="small">miúdo</AppText>
      </>,
    );
    expect(styleOf('grande').fontFamily).toMatch(/^Archivo_/);
    expect(styleOf('miúdo').fontFamily).toMatch(/^Manrope_/);
  });

  it('o peso escolhe a família, e não a propriedade `fontWeight`, que fonte carregada ignora', () => {
    render(
      <>
        <AppText weight="400">leve</AppText>
        <AppText weight="800">pesado</AppText>
      </>,
    );
    expect(styleOf('leve').fontFamily).toBe('Manrope_400Regular');
    expect(styleOf('pesado').fontFamily).toBe('Manrope_800ExtraBold');
    expect(styleOf('pesado').fontWeight).toBeUndefined();
  });

  it('a entrelinha dos dois maiores tamanhos é maior que o corpo, senão o acento é cortado', () => {
    render(
      <>
        <AppText variant="display">Amanhã</AppText>
        <AppText variant="xp">Concluído</AppText>
      </>,
    );
    expect(Number(styleOf('Amanhã').lineHeight)).toBeGreaterThan(tokens.font.display);
    expect(Number(styleOf('Concluído').lineHeight)).toBeGreaterThan(tokens.font.xp);
  });
});
