import { StyleSheet, Text, View } from 'react-native';

import type { HourScore } from '@/domain';

import { t } from '../../../i18n/pt-BR';

export function HourlyList({
  hours,
  nowHour,
}: {
  readonly hours: readonly HourScore[];
  readonly nowHour: number | null;
}) {
  return (
    <View>
      <Text style={styles.title}>{t.home.hourly}</Text>
      {hours.map((h) => (
        <Text key={h.hour.time} style={h.hour.hour === nowHour ? styles.now : undefined}>
          {`${String(h.hour.hour).padStart(2, '0')}h · ${h.score} · ${t.labels[h.label]}`}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', marginTop: 16 },
  now: { fontWeight: '700' },
});
