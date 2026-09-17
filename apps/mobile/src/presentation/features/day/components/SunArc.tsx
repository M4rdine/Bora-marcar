import { StyleSheet, View } from 'react-native';

import { minutesOfDay } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { AppText, Icon, tokens } from '../../../ui';

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

function NowMarker({ pct, isDay }: { readonly pct: number; readonly isDay: boolean }) {
  return (
    <View style={[styles.marker, { left: `${pct * 100}%` }]}>
      {/* O sol e a lua do próprio conjunto. Eram ☀️/🌙 do sistema, a uma tela de distância do
          crescente vetorial que o app desenha para "céu limpo à noite". */}
      <Icon
        name={isDay ? 'clear' : 'clearNight'}
        size={tokens.size.sunMarker}
        label={isDay ? t.home.sunLabel : t.home.moonLabel}
      />
    </View>
  );
}

/** Arco do sol: rótulos de nascer/pôr do sol e, quando há um "agora" (só hoje), o marcador
 * de sol/lua na posição dele. Dias futuros mostram só o arco com os horários. */
export function SunArc({ sunrise, sunset, nowMinutes }: Props) {
  if (sunrise === null || sunset === null) return <View style={styles.arc} />;
  const marker = nowMinutes === null ? null : markerPosition(sunrise, sunset, nowMinutes);
  return (
    <View style={styles.arc}>
      {marker ? <NowMarker pct={marker.pct} isDay={marker.isDay} /> : null}
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
