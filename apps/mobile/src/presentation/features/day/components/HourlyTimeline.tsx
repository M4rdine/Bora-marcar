import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { HourScore } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import {
  AppText,
  motion,
  ScoreLegend,
  SectionHeader,
  Surface,
  tokens,
  useReducedMotion,
} from '../../../ui';

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
const PULSE_MIN_OPACITY = 0.35;
function nowAside(hours: readonly HourScore[], nowHour: number | null): string | undefined {
  const now = hours.find((h) => h.hour.hour === nowHour);
  return now ? `${t.home.now}: ${t.labels[now.label]} · ${now.score}` : undefined;
}

/** Contorno pulsante da barra "agora"; com movimento reduzido fica estático e visível. */
function NowOutline() {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!reduced) {
      opacity.value = withRepeat(
        withTiming(PULSE_MIN_OPACITY, { duration: motion.normal, easing: motion.easing }),
        -1,
        true,
      );
    }
    return () => cancelAnimation(opacity);
  }, [reduced, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View testID="now-outline" pointerEvents="none" style={[styles.nowOutline, style]} />
  );
}

function Bar({ hour, nowHour }: { readonly hour: HourScore; readonly nowHour: number | null }) {
  const isNow = hour.hour.hour === nowHour;
  return (
    <View
      accessible
      accessibilityLabel={t.home.hourAria(hour.hour.hour, hour.score, t.labels[hour.label])}
      style={[styles.barWrap, { height: HEIGHT_BASE + hour.score * HEIGHT_PER_SCORE }]}
    >
      <View style={[styles.bar, { backgroundColor: tokens.color.score[hour.label] }]} />
      {isNow ? <NowOutline /> : null}
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
      <ScoreLegend />
    </Surface>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: BARS_HEIGHT },
  barWrap: { flex: 1 },
  bar: { flex: 1, borderRadius: tokens.space[1] },
  nowOutline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: tokens.space[1],
    borderWidth: 1,
    borderColor: tokens.color.accent,
  },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
