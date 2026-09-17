import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { t } from '../../i18n/pt-BR';
import { weatherGlyph } from '../../i18n/weatherGlyph';
import { AppText, Icon, tokens } from '../../ui';
import type { TimelineHour } from '../hourlySequence';

/** Mínimo de toque da Apple. Nenhuma linha da cronologia fica abaixo disto. */
const MIN_TOUCH_HEIGHT = 48;
const GLYPH_SIZE = 18;
const RAIN_WORTH_SHOWING = 10;
const MAX_SCORE = 100;
const BAR_WIDTH = 64;
const BAR_HEIGHT = 6;

type Props = {
  readonly item: TimelineHour;
  readonly itemKey: string;
  readonly dayLabel: string;
  readonly selected: boolean;
  readonly isBest: boolean;
  /** Recebe a chave em vez de fechar sobre ela: é o que mantém a função estável entre renders,
   * sem a qual a memoização abaixo não serviria para nada. */
  readonly onPress: (key: string) => void;
};

/**
 * A nota como barra, e não como palavra.
 *
 * Antes toda linha imprimia o rótulo junto do número, e num dia bom saíam oito "Ótimo" seguidos:
 * uma coluna de repetições de alto contraste que puxava o olho e não dizia nada. A barra tem
 * comprimento proporcional à nota, então vinte e quatro linhas desenham a curva do dia e a
 * comparação entre horas acontece de relance, sem ler.
 */
function ScoreBar({
  score,
  tone,
}: {
  readonly score: number;
  readonly tone: TimelineHour['hour']['label'];
}) {
  return (
    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          {
            width: `${Math.max(4, (score / MAX_SCORE) * 100)}%`,
            backgroundColor: tokens.color.score[tone],
          },
        ]}
      />
    </View>
  );
}

function HourRowView({ item, itemKey, dayLabel, selected, isBest, onPress }: Props) {
  const { hour } = item;
  const glyph = weatherGlyph(hour.hour.weatherCode);
  const rain = hour.hour.precipitationProbability;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={t.chronology.hourAria(
        dayLabel,
        hour.hour.hour,
        hour.score,
        t.labels[hour.label],
        hour.hour.temperature,
      )}
      onPress={() => onPress(itemKey)}
      style={({ pressed }) => [
        styles.row,
        selected ? styles.selected : null,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.timeCell}>
        <AppText variant="subtitle" weight="700" tabular>
          {`${hour.hour.hour}h`}
        </AppText>
        {item.isNow ? (
          <AppText variant="micro" tone="muted">
            {t.chronology.now}
          </AppText>
        ) : null}
      </View>

      <View style={styles.conditions}>
        <Icon name={glyph.icon} size={GLYPH_SIZE} label={glyph.summary} />
        <AppText variant="body" weight="700" tabular>
          {t.chronology.temperature(hour.hour.temperature)}
        </AppText>
        {rain >= RAIN_WORTH_SHOWING ? (
          <AppText variant="micro" tone="muted" tabular>
            {t.chronology.rainChance(rain)}
          </AppText>
        ) : null}
      </View>

      <View style={styles.scoreCell}>
        <ScoreBar score={hour.score} tone={hour.label} />
        <AppText variant="small" weight="800" tabular style={styles.score}>
          {String(hour.score)}
        </AppText>
      </View>
      {isBest ? <View style={styles.bestMark} /> : null}
    </Pressable>
  );
}

const TIME_CELL_WIDTH = 52;
const SCORE_WIDTH = 24;
const BEST_MARK_WIDTH = 3;

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
  scoreCell: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  barTrack: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.shade,
    overflow: 'hidden',
  },
  barFill: { height: BAR_HEIGHT, borderRadius: tokens.radius.pill },
  score: { width: SCORE_WIDTH, textAlign: 'right' },
  /** A melhor hora ganha um traço na borda, e não uma palavra: marca sem competir com o dado. */
  bestMark: {
    position: 'absolute',
    left: 0,
    top: tokens.space[2],
    bottom: tokens.space[2],
    width: BEST_MARK_WIDTH,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.accent,
  },
});

/**
 * Memoizado porque a lista tem 24 linhas e cada uma desenha um ícone vetorial. Sem isto, abrir o
 * detalhe de uma hora redesenha as outras 23 — custo que aparece como travada no aparelho e como
 * teste lento sob carga.
 */
export const HourRow = memo(HourRowView);
