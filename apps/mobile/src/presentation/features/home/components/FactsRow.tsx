import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { AppText, Surface, tokens } from '../../../ui';
import type { WindowFacts } from '../windowFacts';

type Fact = { readonly emoji: string; readonly value: string; readonly label: string };

const factsOf = (facts: WindowFacts): readonly Fact[] => [
  { emoji: '🌡', value: `${facts.apparent}°`, label: t.facts.apparent },
  { emoji: '💧', value: `${facts.rainPct}%`, label: t.facts.rain },
  { emoji: '🍃', value: `${facts.windKmh}`, label: t.facts.wind },
  { emoji: '☀️', value: `${facts.uv}`, label: t.facts.uv },
];

export function FactsRow({ facts }: { readonly facts: WindowFacts }) {
  return (
    <View style={styles.row}>
      {factsOf(facts).map((fact) => (
        <Surface key={fact.label} strength="shade" padding={2} gap={1} style={styles.cell}>
          <AppText>{fact.emoji}</AppText>
          <AppText variant="subtitle" tabular>
            {fact.value}
          </AppText>
          <AppText variant="micro" tone="muted">
            {fact.label}
          </AppText>
        </Surface>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space[2] },
  cell: { flex: 1, alignItems: 'center' },
});
