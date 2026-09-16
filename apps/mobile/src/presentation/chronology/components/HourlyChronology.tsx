import { Fragment, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ActivityProfile } from '@/domain';

import { t } from '../../i18n/pt-BR';
import { AppText, SectionHeader, Surface, tokens } from '../../ui';
import { bestOfSequence, type TimelineHour } from '../hourlySequence';

import { HourDetail } from './HourDetail';
import { HourRow } from './HourRow';

const keyOf = (item: TimelineHour): string => item.hour.hour.time;

type Props = {
  readonly sequence: readonly TimelineHour[];
  readonly profile: ActivityProfile;
  readonly onPlanHour: ((item: TimelineHour) => void) | null;
  readonly title?: string;
  readonly subtitle?: string;
  /**
   * Cabeçalhos "Hoje"/"Amanhã" entre os blocos. A tela inicial atravessa a meia-noite e precisa
   * deles; a tela de um dia específico mostra um dia só, onde eles mentiriam.
   */
  readonly showDayHeadings?: boolean;
  /** Nome do dia de cada bloco, usado no cabeçalho e no rótulo de acessibilidade de cada hora. */
  readonly dayLabelFor?: (dayOffset: 0 | 1) => string;
};

const defaultDayLabel = (dayOffset: 0 | 1): string =>
  dayOffset === 0 ? t.chronology.today : t.chronology.tomorrow;

/**
 * A cronologia: horas em sequência, cada uma com nota, temperatura e chuva. A recomendação do
 * motor aparece como destaque dentro dela ("melhor"), não como veredito acima dela — quem
 * escolhe o horário é quem vai sair.
 */
export function HourlyChronology({
  sequence,
  profile,
  onPlanHour,
  title = t.chronology.title,
  subtitle = t.chronology.subtitle,
  showDayHeadings = true,
  dayLabelFor = defaultDayLabel,
}: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const best = bestOfSequence(sequence);

  if (sequence.length === 0) return null;

  return (
    <Surface accessibilityLabel="cronologia" strength="soft" radius="card" padding={3} gap={2}>
      <View style={styles.header}>
        <SectionHeader title={title} />
        <AppText variant="micro" tone="muted">
          {subtitle}
        </AppText>
      </View>

      {sequence.map((item, index) => {
        const key = keyOf(item);
        const selected = key === selectedKey;
        const previous = sequence[index - 1];
        const startsNewDay = previous !== undefined && previous.dayOffset !== item.dayOffset;
        return (
          <Fragment key={key}>
            {showDayHeadings && (index === 0 || startsNewDay) ? (
              <AppText variant="kicker" style={styles.dayHeading}>
                {dayLabelFor(item.dayOffset)}
              </AppText>
            ) : null}
            <HourRow
              item={item}
              dayLabel={dayLabelFor(item.dayOffset)}
              selected={selected}
              isBest={best !== null && keyOf(best) === key}
              onPress={() => setSelectedKey(selected ? null : key)}
            />
            {selected ? (
              <HourDetail
                hour={item.hour}
                profile={profile}
                // Só o primeiro dia da sequência aceita plano: o domínio guarda um plano ativo por
                // dia. As demais horas continuam abrindo o detalhe, que é onde mora o "por que".
                onPlan={onPlanHour && item.dayOffset === 0 ? () => onPlanHour(item) : null}
              />
            ) : null}
          </Fragment>
        );
      })}
    </Surface>
  );
}

const styles = StyleSheet.create({
  header: { gap: tokens.space[1], paddingHorizontal: tokens.space[3] },
  dayHeading: { paddingHorizontal: tokens.space[3], paddingTop: tokens.space[2] },
});
