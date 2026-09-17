import { StyleSheet, View } from 'react-native';

import type { ScoreLabel } from '@/domain';

import { t } from '../i18n/pt-BR';

import { AppText } from './Text';
import { tokens } from './tokens';

/**
 * A chave das quatro cores da escala.
 *
 * Mora no design system, e não dentro de um gráfico, porque a mesma escala pinta dois lugares: as
 * barras do dia E as vinte e quatro linhas da cronologia. A chave existia só no gráfico do dia —
 * quem abria o app via as quatro cores repetidas o dia inteiro na tela inicial sem nada dizendo o
 * que elas querem dizer, e a palavra da nota só existia no rótulo de acessibilidade.
 *
 * Os nomes vêm de `t.labels`, o mesmo vocabulário das linhas. Já foram uma lista própria dizendo
 * "Ok/Evite" a poucos pixels de linhas dizendo "Razoável/Ruim".
 */
const TONES: readonly ScoreLabel[] = ['great', 'good', 'fair', 'poor'];

const DOT_SIZE = tokens.space[2];

export function ScoreLegend() {
  return (
    <View style={styles.legend} accessibilityLabel={t.chronology.legendLabel} accessible>
      {TONES.map((tone) => (
        <View key={tone} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: tokens.color.score[tone] }]} />
          <AppText variant="micro" tone="muted">
            {t.labels[tone]}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  item: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2 },
});
