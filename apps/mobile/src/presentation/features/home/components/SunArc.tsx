import { StyleSheet, View } from 'react-native';

import { minutesOfDay } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { AppText, Emoji, tokens } from '../../../ui';

type Props = {
  readonly sunrise: string | null;
  readonly sunset: string | null;
  readonly nowMinutes: number | null;
};

const timeLabel = (iso: string): string => iso.slice(iso.indexOf('T') + 1);

function markerPosition(
  sunrise: string,
  sunset: string,
  nowMinutes: number,
): { readonly pct: number; readonly isDay: boolean } {
  const start = minutesOfDay(sunrise);
  const end = minutesOfDay(sunset);
  if (nowMinutes < start) return { pct: 0, isDay: false };
  if (nowMinutes > end) return { pct: 1, isDay: false };
  return { pct: (nowMinutes - start) / Math.max(1, end - start), isDay: true };
}

/** Arco do sol: rótulos de nascer/pôr do sol e um marcador (☀️/🌙) na posição do "agora". */
export function SunArc({ sunrise, sunset, nowMinutes }: Props) {
  if (sunrise === null || sunset === null || nowMinutes === null) {
    return <View style={styles.arc} />;
  }
  const { pct, isDay } = markerPosition(sunrise, sunset, nowMinutes);
  return (
    <View style={styles.arc}>
      <View style={[styles.marker, { left: `${pct * 100}%` }]}>
        <Emoji
          symbol={isDay ? '☀️' : '🌙'}
          size={tokens.size.sunMarker}
          label={isDay ? t.home.sunLabel : t.home.moonLabel}
        />
      </View>
      <View style={styles.labels}>
        <AppText variant="micro" tone="muted">
          {timeLabel(sunrise)}
        </AppText>
        <AppText variant="micro" tone="muted">
          {timeLabel(sunset)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  arc: {
    height: tokens.size.sunArc,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: tokens.color.border,
    borderTopLeftRadius: tokens.radius.pill,
    borderTopRightRadius: tokens.radius.pill,
    justifyContent: 'flex-end',
  },
  // `left` é a borda esquerda do marcador; deslocar meia largura centraliza o emoji no ponto do
  // "agora" e impede que ele vaze para fora do arco em `pct` 0 (nascer) e 1 (pôr do sol).
  marker: {
    position: 'absolute',
    top: -tokens.space[2],
    transform: [{ translateX: -tokens.size.sunMarker / 2 }],
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[1],
  },
});
