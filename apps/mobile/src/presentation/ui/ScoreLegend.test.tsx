import { render, screen } from '@testing-library/react-native';

import { t } from '../i18n/pt-BR';

import { ScoreLegend } from './ScoreLegend';

describe('ScoreLegend', () => {
  /**
   * A chave tem que cobrir a escala INTEIRA. Já foram três itens tirados de uma lista própria, e
   * as barras de "Bom" ficavam sem explicação.
   */
  it('nomeia os quatro tons da escala, com o vocabulário das linhas', () => {
    render(<ScoreLegend />);
    for (const label of [t.labels.great, t.labels.good, t.labels.fair, t.labels.poor]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});
