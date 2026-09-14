import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { AppText, tokens } from '../../../ui';

type Props = {
  readonly level: number;
  readonly name: string;
  /** 0–1: progresso dentro do nível atual. */
  readonly progress: number;
};

const SIZE = tokens.size.orb;
const BORDER = tokens.size.orbBorder;

/**
 * Anel de progresso sem SVG: um traço de base e, por cima, um segundo traço dourado em duas
 * bordas (topo/direita) rotacionado por `progress * 360`. Simplificação aceita pelo design: a
 * exatidão do arco não é crítica, o que importa é o número e o `accessibilityLabel`.
 */
export function LevelOrb({ level, name, progress }: Props) {
  const clamped = Math.min(1, Math.max(0, progress));
  const pct = Math.round(clamped * 100);
  return (
    <View accessible accessibilityLabel={t.level.aria(level, name, pct)} style={styles.wrap}>
      <View style={styles.track} />
      <View style={[styles.progress, { transform: [{ rotate: `${clamped * 360}deg` }] }]} />
      <View style={styles.inner}>
        <AppText variant="small" weight="800" tone="ink">
          {level}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE },
  track: {
    ...StyleSheet.absoluteFill,
    borderRadius: SIZE / 2,
    borderWidth: BORDER,
    borderColor: tokens.color.surfaceStrong,
  },
  progress: {
    ...StyleSheet.absoluteFill,
    borderRadius: SIZE / 2,
    borderWidth: BORDER,
    borderTopColor: tokens.color.gold,
    borderRightColor: tokens.color.gold,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  inner: {
    ...StyleSheet.absoluteFill,
    margin: BORDER,
    borderRadius: SIZE / 2 - BORDER,
    backgroundColor: tokens.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
