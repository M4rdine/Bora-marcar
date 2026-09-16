import { StyleSheet, View } from 'react-native';

import type { ActivityProfile, HourScore } from '@/domain';

import { t } from '../../i18n/pt-BR';
import { AppText, Button, tokens, type ScoreTone } from '../../ui';
import { factorBreakdown, limitingFactor, type FactorRow } from '../factorBreakdown';

/** Abaixo disto o fator não é culpado de nada: a hora é boa e dizer o contrário confunde. */
const MIN_LIMITING_IMPACT = 0.08;
const PERCENT = 100;

const TONE_BY_COMFORT: readonly { readonly min: number; readonly tone: ScoreTone }[] = [
  { min: 0.8, tone: 'great' },
  { min: 0.6, tone: 'good' },
  { min: 0.4, tone: 'fair' },
];

function toneFor(comfort: number): ScoreTone {
  return TONE_BY_COMFORT.find((step) => comfort >= step.min)?.tone ?? 'poor';
}

function FactorLine({ row }: { readonly row: FactorRow }) {
  const name = t.chronology.factors[row.id];
  const pct = Math.round(row.comfort * PERCENT);
  return (
    <View accessible accessibilityLabel={t.chronology.comfortAria(name, pct)} style={styles.factor}>
      <AppText variant="small" style={styles.factorName}>
        {name}
      </AppText>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${pct}%`, backgroundColor: tokens.color.score[toneFor(row.comfort)] },
          ]}
        />
      </View>
      <AppText variant="micro" tone="muted" style={styles.weight}>
        {t.chronology.factorWeight(Math.round(row.weight * PERCENT))}
      </AppText>
    </View>
  );
}

type Props = {
  readonly hour: HourScore;
  readonly profile: ActivityProfile;
  readonly onPlan: (() => void) | null;
};

/**
 * O motor sempre soube por que uma hora é boa ou ruim; esta é a primeira tela que conta. Os
 * fatores vêm ordenados pelo que mais derruba a nota, então a primeira linha é a explicação.
 */
export function HourDetail({ hour, profile, onPlan }: Props) {
  const rows = factorBreakdown(hour, profile);
  const limiting = limitingFactor(rows, MIN_LIMITING_IMPACT);
  return (
    <View style={styles.container}>
      <AppText variant="kicker">{t.chronology.whyTitle}</AppText>
      {rows.map((row) => (
        <FactorLine key={row.id} row={row} />
      ))}
      <AppText variant="small" tone="muted">
        {limiting
          ? t.chronology.limiting(t.chronology.factors[limiting.id])
          : t.chronology.nothingLimiting}
      </AppText>
      {hour.veto ? (
        <AppText variant="small" style={styles.veto}>
          {t.chronology.vetoed(t.reasons[hour.veto])}
        </AppText>
      ) : null}
      {onPlan ? (
        <Button label={t.home.plan(profile.name, hour.hour.hour)} onPress={onPlan} />
      ) : null}
    </View>
  );
}

const TRACK_HEIGHT = 6;
const FACTOR_NAME_WIDTH = 92;
const WEIGHT_WIDTH = 64;

const styles = StyleSheet.create({
  container: {
    gap: tokens.space[2],
    paddingTop: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    paddingBottom: tokens.space[3],
  },
  factor: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  factorName: { width: FACTOR_NAME_WIDTH },
  track: {
    flex: 1,
    height: TRACK_HEIGHT,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.shade,
    overflow: 'hidden',
  },
  fill: { height: TRACK_HEIGHT, borderRadius: tokens.radius.pill },
  weight: { width: WEIGHT_WIDTH, textAlign: 'right' },
  veto: { color: tokens.color.danger },
});
