import { Pressable, StyleSheet, View } from 'react-native';

import type { DayRecommendation } from '@/domain';

import { formatHourRange } from '../../../format/hourRange';
import { t } from '../../../i18n/pt-BR';
import type { WeatherGlyph } from '../../../i18n/weatherGlyph';
import { AppText, Icon, Pill, tokens } from '../../../ui';

type Props = {
  readonly day: DayRecommendation;
  readonly title: string;
  readonly glyph: WeatherGlyph;
  readonly isBest: boolean;
  readonly onPress: () => void;
};

function summaryOf(day: DayRecommendation, glyph: WeatherGlyph): string {
  if (day.result.kind !== 'window') {
    return t.home.noWindowRow(day.result.dominant ? t.reasons[day.result.dominant] : null);
  }
  const { startHour, endHour } = day.result.window;
  const tempMax = day.daily?.tempMax ?? null;
  const temperature = tempMax !== null ? `${tempMax}°, ` : '';
  return `${formatHourRange(startHour, endHour)} · ${temperature}${glyph.summary}`;
}

const scoreOf = (day: DayRecommendation): number | null =>
  day.result.kind === 'window' ? day.result.score : (day.result.best?.score ?? null);

export function DayRow({ day, title, glyph, isBest, onPress }: Props) {
  const score = scoreOf(day);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        isBest ? styles.best : styles.separator,
        pressed ? styles.pressed : null,
      ]}
    >
      {isBest ? (
        <AppText variant="micro" weight="800" tone="mint">
          {t.home.bestOfWeek}
        </AppText>
      ) : null}
      <View style={styles.line}>
        <AppText variant="body" weight="700" style={styles.title}>
          {title}
        </AppText>
        <Icon name={glyph.icon} size={GLYPH_SIZE} label={glyph.summary} />
        <AppText variant="small" tone="muted" style={styles.summary}>
          {summaryOf(day, glyph)}
        </AppText>
        {score !== null ? <Pill label={`${score}`} tone={day.label ?? 'poor'} /> : null}
      </View>
    </Pressable>
  );
}

const GLYPH_SIZE = 20;

const styles = StyleSheet.create({
  row: {
    minHeight: tokens.size.minTouch,
    justifyContent: 'center',
    paddingVertical: tokens.space[2],
    gap: tokens.space[1],
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.color.border,
  },
  /**
   * Os quatro lados verdes precisam ser declarados: `borderBottomColor` vence `borderColor`, e
   * era por isso que o destaque da melhor semana ficava com três lados verdes e o de baixo não.
   */
  best: {
    borderWidth: 1,
    borderColor: tokens.color.mint,
    borderBottomColor: tokens.color.mint,
    borderRadius: tokens.radius.inner,
    padding: tokens.space[2],
  },
  pressed: { opacity: 0.6 },
  line: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  title: { flexShrink: 0 },
  summary: { flex: 1 },
});
