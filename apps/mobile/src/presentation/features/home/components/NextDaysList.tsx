import { StyleSheet, Text, View } from 'react-native';

import type { Comparison, DayRecommendation } from '@/domain';

import { t } from '../../../i18n/pt-BR';

type Props = {
  readonly days: readonly DayRecommendation[];
  readonly comparison: Comparison;
  readonly bestDate: string | null;
};

const line = (d: DayRecommendation): string =>
  d.result.kind === 'window'
    ? `${d.date} · ${d.result.window.startHour}h – ${d.result.window.endHour}h · ${d.result.score}`
    : `${d.date} · ${t.home.noWindow}`;

export function NextDaysList({ days, comparison, bestDate }: Props) {
  return (
    <View>
      <Text style={styles.title}>{t.home.nextDays}</Text>
      {comparison === 'tomorrowBetter' ? <Text>{t.home.tomorrowBetter}</Text> : null}
      {comparison === 'todayBestOfWeek' ? <Text>{t.home.todayBest}</Text> : null}
      {days.map((d) => (
        <Text key={d.date} style={d.date === bestDate ? styles.best : undefined}>
          {line(d)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: '700', marginTop: 16 },
  best: { fontWeight: '700' },
});
