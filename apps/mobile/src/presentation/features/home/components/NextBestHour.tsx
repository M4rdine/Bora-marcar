import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ActivityProfile, HourScore } from '@/domain';

import { HourDetail, HourRow } from '../../../chronology';
import { t } from '../../../i18n/pt-BR';
import { AppText, tokens } from '../../../ui';

type Props = {
  readonly hour: HourScore;
  readonly profile: ActivityProfile;
  readonly onPlan: (() => void) | null;
};

/**
 * O que ainda resta do dia, depois que a melhor hora passou.
 *
 * Nasceu como uma frase solta — "ainda resta 23h — Ruim, 36" — e frase não se toca. Aqui é a
 * MESMA linha de "Suas próximas horas": mesma barra, mesma cor, mesmo detalhe de "por que esta
 * nota" ao abrir. Quem perdeu a melhor hora quer olhar a alternativa com o mesmo cuidado com que
 * olharia qualquer outra, e não decorar um número que apareceu no meio de um cartão.
 *
 * O cabeçalho em letra menor é de propósito: o que sobrou costuma ser ruim, e a hierarquia diz
 * isso antes de qualquer número.
 */
export function NextBestHour({ hour, profile, onPlan }: Props) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((v) => !v), []);
  return (
    <View style={styles.wrap}>
      <AppText variant="micro" tone="muted">
        {t.home.stillAhead}
      </AppText>
      <HourRow
        item={{ hour, isNow: false, dayOffset: 0 }}
        itemKey={hour.hour.time}
        dayLabel={t.chronology.today}
        selected={open}
        isBest={false}
        onPress={toggle}
      />
      {open ? <HourDetail hour={hour} profile={profile} onPlan={onPlan} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[1], marginTop: tokens.space[2] },
});
