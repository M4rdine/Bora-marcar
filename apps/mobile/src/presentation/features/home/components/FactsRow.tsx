import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { AppText, Icon, Surface, tokens, type IconName } from '../../../ui';
import type { WindowFacts } from '../windowFacts';

type Fact = { readonly icon: IconName; readonly value: string; readonly label: string };

const factsOf = (facts: WindowFacts): readonly Fact[] => [
  { icon: 'thermal', value: `${facts.apparent}°`, label: t.facts.apparent },
  { icon: 'drop', value: `${facts.rainPct}%`, label: t.facts.rain },
  { icon: 'wind', value: `${facts.windKmh}`, label: t.facts.wind },
  { icon: 'uv', value: `${facts.uv}`, label: t.facts.uv },
];

export function FactsRow({ facts }: { readonly facts: WindowFacts }) {
  return (
    <View style={styles.row}>
      {factsOf(facts).map((fact) => (
        <Surface key={fact.label} strength="shade" padding={2} gap={1} style={styles.cell}>
          <Icon name={fact.icon} size={ICON_SIZE} color={tokens.color.text} />
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

const ICON_SIZE = 18;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space[2] },
  cell: { flex: 1, alignItems: 'center' },
});
