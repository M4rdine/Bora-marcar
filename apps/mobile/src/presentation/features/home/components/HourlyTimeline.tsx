import { StyleSheet, View } from 'react-native';

import type { HourScore } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { AppText, SectionHeader, Surface, tokens } from '../../../ui';

import { SunArc } from './SunArc';

type Props = {
  readonly hours: readonly HourScore[];
  readonly nowHour: number | null;
  readonly sunrise: string | null;
  readonly sunset: string | null;
};

const HEIGHT_BASE = 4;
const HEIGHT_PER_SCORE = 0.44;
const MAX_SCORE = 100;
const BARS_HEIGHT = HEIGHT_BASE + MAX_SCORE * HEIGHT_PER_SCORE;
const LEGEND_TONES: readonly (keyof typeof t.home.legend)[] = ['great', 'fair', 'poor'];

function nowAside(hours: readonly HourScore[], nowHour: number | null): string | undefined {
  const now = hours.find((h) => h.hour.hour === nowHour);
  return now ? `${t.home.now}: ${t.labels[now.label]} · ${now.score}` : undefined;
}

function Bar({ hour, nowHour }: { readonly hour: HourScore; readonly nowHour: number | null }) {
  const isNow = hour.hour.hour === nowHour;
  return (
    <View
      accessible
      accessibilityLabel={t.home.hourAria(hour.hour.hour, hour.score, t.labels[hour.label])}
      style={[
        styles.bar,
        {
          height: HEIGHT_BASE + hour.score * HEIGHT_PER_SCORE,
          backgroundColor: tokens.color.score[hour.label],
        },
        isNow ? styles.now : null,
      ]}
    />
  );
}

function Legend() {
  return (
    <View style={styles.legend}>
      {LEGEND_TONES.map((tone) => (
        <View key={tone} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: tokens.color.score[tone] }]} />
          <AppText variant="micro" tone="muted">
            {t.home.legend[tone]}
          </AppText>
        </View>
      ))}
    </View>
  );
}

export function HourlyTimeline({ hours, nowHour, sunrise, sunset }: Props) {
  const nowMinutes = nowHour !== null ? nowHour * 60 : null;
  return (
    <Surface strength="soft" radius="card" padding={4} gap={3}>
      <SectionHeader title={t.home.hourly} aside={nowAside(hours, nowHour)} />
      <SunArc sunrise={sunrise} sunset={sunset} nowMinutes={nowMinutes} />
      <View accessibilityRole="list" style={styles.bars}>
        {hours.map((hour) => (
          <Bar key={hour.hour.time} hour={hour} nowHour={nowHour} />
        ))}
      </View>
      <View style={styles.axis}>
        {t.home.axisLabels.map((label) => (
          <AppText key={label} variant="micro" tone="muted">
            {label}
          </AppText>
        ))}
      </View>
      <Legend />
    </Surface>
  );
}

const DOT_SIZE = tokens.space[2];

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: BARS_HEIGHT },
  bar: { flex: 1, borderRadius: tokens.space[1] },
  now: { borderWidth: 1, borderColor: tokens.color.accent },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  legend: { flexDirection: 'row', gap: tokens.space[3] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2 },
});
