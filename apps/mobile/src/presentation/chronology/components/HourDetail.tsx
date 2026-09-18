import { StyleSheet, View } from 'react-native';

import {
  explainScore,
  type ActivityProfile,
  type FactorAccount,
  type FactorId,
  type HourScore,
  type ScoreAdjustment,
} from '@/domain';

import { t } from '../../i18n/pt-BR';
import { AppText, Button, tokens, type ScoreTone } from '../../ui';

const PERCENT = 100;

const TONE_BY_COMFORT: readonly { readonly min: number; readonly tone: ScoreTone }[] = [
  { min: 0.8, tone: 'great' },
  { min: 0.6, tone: 'good' },
  { min: 0.4, tone: 'fair' },
];

const toneFor = (comfort: number): ScoreTone =>
  TONE_BY_COMFORT.find((step) => comfort >= step.min)?.tone ?? 'poor';

/** A leitura de cada fator na unidade em que ela existe no mundo. */
function readingOf(row: FactorAccount): string {
  const r = t.chronology.readings;
  const map: Record<FactorId, () => string> = {
    thermal: () => r.thermal(row.reading),
    rain: () => r.rain(Math.round(row.reading), row.secondary ?? 0),
    wind: () => r.wind(row.reading, row.secondary ?? row.reading),
    uv: () => r.uv(row.reading),
    sun: () => r.sun(row.reading),
  };
  return map[row.id]();
}

/**
 * Uma parcela da nota.
 *
 * A barra tem duas variáveis, e é isso que a faz explicar em vez de decorar: a LARGURA do trilho
 * é o peso do fator nesta atividade — quanto ele vale, no máximo —, e o PREENCHIMENTO é quanto
 * dele a hora conquistou. Um fator de peso alto meio vazio salta aos olhos; um de peso baixo
 * cheio não engana ninguém.
 */
function FactorLine({
  row,
  maxWeight,
  activity,
}: {
  readonly row: FactorAccount;
  readonly maxWeight: number;
  readonly activity: string;
}) {
  const name = t.chronology.factors[row.id];
  const reading = readingOf(row);
  const got = Math.round(row.points);
  const max = Math.round(row.maxPoints);
  // Peso zero não é uma barra vazia — é uma informação: nuvem não muda nada numa pedalada. A
  // barra de comprimento zero lia como componente quebrado e escondia justamente essa decisão
  // do perfil.
  const irrelevante = row.maxPoints === 0;
  const trackPct = Math.max(8, (row.maxPoints / maxWeight) * PERCENT);
  const fillPct = irrelevante ? 0 : (row.points / row.maxPoints) * PERCENT;
  return (
    <View
      accessible
      accessibilityLabel={
        irrelevante
          ? `${name}, ${reading}, ${t.chronology.notCounted(activity)}`
          : t.chronology.factorAria(name, reading, got, max)
      }
      style={styles.factor}
    >
      <View style={styles.factorHead}>
        <AppText variant="small" weight="600">
          {name}
        </AppText>
        <AppText variant="small" tone="muted">
          {reading}
        </AppText>
      </View>
      {irrelevante ? (
        <AppText variant="micro" tone="muted">
          {t.chronology.notCounted(activity)}
        </AppText>
      ) : (
        <View style={styles.barRow}>
          <View style={styles.barArea}>
            <View style={[styles.track, { width: `${trackPct}%` }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${fillPct}%`,
                    backgroundColor: tokens.color.score[toneFor(row.comfort)],
                  },
                ]}
              />
            </View>
          </View>
          <AppText variant="micro" tone="muted" tabular style={styles.points}>
            {t.chronology.points(got, max)}
          </AppText>
        </View>
      )}
    </View>
  );
}

/** Cada corte aplicado depois da soma, dito com o número que ele impõe. */
function adjustmentText(adj: ScoreAdjustment): string {
  if (adj.kind === 'night') return t.chronology.nightCut(Math.round(adj.factor * PERCENT));
  if (adj.kind === 'fog') return t.chronology.fogCut(Math.round(adj.factor * PERCENT));
  return t.chronology.vetoCut(t.reasons[adj.id], adj.cap);
}

type Props = {
  readonly hour: HourScore;
  readonly profile: ActivityProfile;
  readonly onPlan: (() => void) | null;
};

/**
 * A nota de uma hora, aberta parcela por parcela.
 *
 * Antes daqui, uma hora boa recebia a frase "nenhum fator atrapalha esta hora" e mais nada — o
 * app pontuava de 0 a 100 e não dizia o que media, quanto cada coisa pesava, nem como chegou ao
 * número. Um motor de recomendação que não presta contas pede confiança sem oferecer motivo.
 *
 * Os cinco fatores aparecem SEMPRE, inclusive os que vão bem: saber que a chuva entregou 25 de 25
 * é informação, não ruído. A conta fecha no rodapé, e `explainScore` tem teste garantindo que ela
 * bate com a nota que o motor deu.
 */
export function HourDetail({ hour, profile, onPlan }: Props) {
  const explanation = explainScore(hour.hour, profile);
  const maxWeight = Math.max(...explanation.factors.map((f) => f.maxPoints), Number.EPSILON);
  const subtotal = Math.round(explanation.subtotal);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppText variant="kicker">{t.chronology.whyTitle}</AppText>
        <AppText variant="micro" tone="muted">
          {t.chronology.howItAdds(profile.name)}
        </AppText>
      </View>

      {explanation.factors.map((row) => (
        <FactorLine key={row.id} row={row} maxWeight={maxWeight} activity={profile.name} />
      ))}

      <View style={styles.rule} />

      <View style={styles.totalRow}>
        <AppText variant="small" tone="muted" style={styles.totalLabel}>
          {t.chronology.subtotal}
        </AppText>
        <AppText variant="small" tone="muted" tabular>
          {subtotal}
        </AppText>
      </View>

      {explanation.adjustments.map((adj) => (
        <View key={adj.kind} style={styles.totalRow}>
          <AppText variant="small" style={[styles.totalLabel, styles.cut]}>
            {adjustmentText(adj)}
          </AppText>
        </View>
      ))}

      <View style={styles.totalRow}>
        <AppText variant="subtitle" style={styles.totalLabel}>
          {t.chronology.finalScore}
        </AppText>
        <AppText variant="subtitle" tabular style={{ color: tokens.color.score[hour.label] }}>
          {explanation.total}
        </AppText>
      </View>

      {onPlan ? (
        <Button label={t.home.plan(profile.name, hour.hour.hour)} onPress={onPlan} />
      ) : null}
    </View>
  );
}

const TRACK_HEIGHT = 8;
const POINTS_WIDTH = 52;

const styles = StyleSheet.create({
  container: {
    gap: tokens.space[2],
    paddingTop: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    paddingBottom: tokens.space[3],
  },
  header: { gap: 2 },
  factor: { gap: 2 },
  factorHead: { flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space[2] },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  barArea: { flex: 1 },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.shade,
    overflow: 'hidden',
  },
  fill: { height: TRACK_HEIGHT, borderRadius: tokens.radius.pill },
  points: { width: POINTS_WIDTH, textAlign: 'right' },
  rule: { height: 1, backgroundColor: tokens.color.surfaceEdge, marginTop: tokens.space[1] },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[2] },
  totalLabel: { flex: 1 },
  cut: { color: tokens.color.score.fair },
});
