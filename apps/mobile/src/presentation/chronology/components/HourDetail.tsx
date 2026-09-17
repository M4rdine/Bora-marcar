import { StyleSheet, View } from 'react-native';

import type { ActivityProfile, HourScore } from '@/domain';

import { t } from '../../i18n/pt-BR';
import { AppText, Button, tokens, type ScoreTone } from '../../ui';
import { factorBreakdown, limitingFactor, type FactorRow } from '../factorBreakdown';

/** Abaixo disto o fator não atrapalha de verdade e não merece uma linha na explicação. */
const MIN_WORTH_SHOWING = 0.04;
/** Abaixo disto ninguém é culpado: a hora é boa e dizer o contrário confunde. */
const MIN_LIMITING_IMPACT = 0.08;
const PERCENT = 100;
const MAX_ROWS = 3;

const TONE_BY_COMFORT: readonly { readonly min: number; readonly tone: ScoreTone }[] = [
  { min: 0.8, tone: 'great' },
  { min: 0.6, tone: 'good' },
  { min: 0.4, tone: 'fair' },
];

const toneFor = (comfort: number): ScoreTone =>
  TONE_BY_COMFORT.find((step) => comfort >= step.min)?.tone ?? 'poor';

/**
 * Uma linha por fator que de fato derruba a nota.
 *
 * A versão anterior desenhava as cinco, com largura igual ao conforto: numa hora boa todas as
 * barras ficavam cheias e da mesma cor, e "Sol · peso 0%" recebia barra idêntica a "Temperatura ·
 * peso 45%". Aqui as variáveis estão invertidas — o PESO dimensiona a linha, porque é ele que diz
 * o quanto o fator importa nesta atividade, e o CONFORTO dá a cor, porque é ele que diz como o
 * fator está agora.
 */
function FactorLine({ row, maxWeight }: { readonly row: FactorRow; readonly maxWeight: number }) {
  const name = t.chronology.factors[row.id];
  const comfortPct = Math.round(row.comfort * PERCENT);
  const widthPct = Math.max(12, (row.weight / maxWeight) * PERCENT);
  return (
    <View
      accessible
      accessibilityLabel={t.chronology.comfortAria(name, comfortPct)}
      style={styles.factor}
    >
      <AppText variant="small" style={styles.factorName}>
        {name}
      </AppText>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${widthPct}%`, backgroundColor: tokens.color.score[toneFor(row.comfort)] },
          ]}
        />
      </View>
    </View>
  );
}

type Props = {
  readonly hour: HourScore;
  readonly profile: ActivityProfile;
  readonly onPlan: (() => void) | null;
};

/**
 * O motor sempre soube por que uma hora é boa ou ruim; esta é a tela que conta. Quando nada
 * atrapalha, a resposta é uma frase — um gráfico sem variação não explica nada e ainda parece
 * componente quebrado.
 */
export function HourDetail({ hour, profile, onPlan }: Props) {
  const rows = factorBreakdown(hour, profile);
  const limiting = limitingFactor(rows, MIN_LIMITING_IMPACT);
  const shown = rows.filter((row) => row.impact >= MIN_WORTH_SHOWING).slice(0, MAX_ROWS);
  const maxWeight = Math.max(...shown.map((row) => row.weight), Number.EPSILON);

  return (
    <View style={styles.container}>
      <AppText variant="kicker">{t.chronology.whyTitle}</AppText>

      <AppText variant="small">
        {limiting
          ? t.chronology.limitingIn(t.chronology.factors[limiting.id], profile.name)
          : t.chronology.nothingLimiting}
      </AppText>

      {shown.map((row) => (
        <FactorLine key={row.id} row={row} maxWeight={maxWeight} />
      ))}

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
const FACTOR_NAME_WIDTH = 96;

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
  veto: { color: tokens.color.danger },
});
