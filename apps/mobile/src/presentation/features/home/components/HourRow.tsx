import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { weatherGlyph } from '../../../i18n/weatherGlyph';
import { AppText, Emoji, Pill, tokens } from '../../../ui';
import type { TimelineHour } from '../hourlySequence';

/** Mínimo de toque da Apple. Nenhuma linha da cronologia fica abaixo disto. */
const MIN_TOUCH_HEIGHT = 48;
const GLYPH_SIZE = 18;
const RAIN_WORTH_SHOWING = 10;

type Props = {
  readonly item: TimelineHour;
  readonly selected: boolean;
  readonly isBest: boolean;
  readonly onPress: () => void;
};

export function HourRow({ item, selected, isBest, onPress }: Props) {
  const { hour } = item;
  const glyph = weatherGlyph(hour.hour.weatherCode);
  const rain = hour.hour.precipitationProbability;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={t.chronology.hourAria(
        item.dayOffset === 0 ? t.chronology.today : t.chronology.tomorrow,
        hour.hour.hour,
        hour.score,
        t.labels[hour.label],
        hour.hour.temperature,
      )}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        selected ? styles.selected : null,
        // Retorno ao toque: sem isto a linha não responde e a lista parece uma página web.
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.timeCell}>
        <AppText variant="subtitle" weight="700">
          {`${hour.hour.hour}h`}
        </AppText>
        {item.isNow ? (
          <AppText variant="micro" tone="muted">
            {t.chronology.now}
          </AppText>
        ) : null}
      </View>

      <View style={styles.conditions}>
        <Emoji symbol={glyph.emoji} size={GLYPH_SIZE} label={glyph.summary} />
        <AppText variant="body" weight="700">
          {t.chronology.temperature(hour.hour.temperature)}
        </AppText>
        {rain >= RAIN_WORTH_SHOWING ? (
          <AppText variant="micro" tone="muted">
            {t.chronology.rainChance(rain)}
          </AppText>
        ) : null}
      </View>

      <View style={styles.scoreCell}>
        {isBest ? (
          <AppText variant="micro" tone="muted">
            {t.chronology.best}
          </AppText>
        ) : null}
        <Pill label={`${t.labels[hour.label]} · ${hour.score}`} tone={hour.label} />
      </View>
    </Pressable>
  );
}

const TIME_CELL_WIDTH = 56;

const styles = StyleSheet.create({
  row: {
    minHeight: MIN_TOUCH_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderRadius: tokens.radius.inner,
  },
  selected: { backgroundColor: tokens.color.surfaceStrong },
  pressed: { opacity: 0.6 },
  timeCell: { width: TIME_CELL_WIDTH },
  conditions: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  scoreCell: { alignItems: 'flex-end', gap: tokens.space[1] },
});
