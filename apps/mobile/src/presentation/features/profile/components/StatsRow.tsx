import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { AppText, Emoji, Surface, tokens } from '../../../ui';

type Props = {
  readonly streak: number;
  readonly activities: number;
  readonly cities: number;
};

type Stat = { readonly symbol: string; readonly value: number; readonly label: string };

/** Três placares iguais (sequência, atividades, cidades) — mockup `.pstats`. */
export function StatsRow({ streak, activities, cities }: Props) {
  const stats: readonly Stat[] = [
    { symbol: '🔥', value: streak, label: t.profile.streak(streak) },
    { symbol: '🏃', value: activities, label: t.profile.activities(activities) },
    { symbol: '🧭', value: cities, label: t.profile.cities(cities) },
  ];
  return (
    <View style={styles.row}>
      {stats.map((stat) => (
        <Surface key={stat.symbol} padding={3} gap={1} style={styles.tile}>
          <Emoji symbol={stat.symbol} label={stat.label} />
          <AppText variant="title" weight="800">
            {stat.value}
          </AppText>
          <AppText variant="micro" tone="muted" style={styles.label}>
            {stat.label}
          </AppText>
        </Surface>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space[2] },
  tile: { flex: 1, alignItems: 'center' },
  label: { textAlign: 'center' },
});
