import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { AppText, tokens } from '../../../ui';

type Props = {
  readonly level: number;
  readonly name: string;
  /** 0–1: progresso dentro do nível atual. */
  readonly progress: number;
  /** Diâmetro do orb; padrão `tokens.size.orb` (usado no cabeçalho compacto). */
  readonly size?: number;
};

const DEFAULT_SIZE = tokens.size.orb;
const BORDER = tokens.size.orbBorder;

/**
 * Anel de progresso sem SVG: um traço de base e, por cima, um segundo traço dourado em duas
 * bordas (topo/direita) rotacionado por `progress * 360`. Simplificação aceita pelo design: a
 * exatidão do arco não é crítica, o que importa é o número e o `accessibilityLabel`.
 */
export function LevelOrb({ level, name, progress, size = DEFAULT_SIZE }: Props) {
  const clamped = Math.min(1, Math.max(0, progress));
  const pct = Math.round(clamped * 100);
  const isLarge = size > DEFAULT_SIZE;
  return (
    <View
      accessible
      accessibilityLabel={t.level.aria(level, name, pct)}
      style={{ width: size, height: size }}
    >
      <View style={[styles.track, { borderRadius: size / 2 }]} />
      <View
        style={[
          styles.progress,
          { borderRadius: size / 2, transform: [{ rotate: `${clamped * 360}deg` }] },
        ]}
      />
      <View style={[styles.inner, { margin: BORDER, borderRadius: size / 2 - BORDER }]}>
        <AppText variant={isLarge ? 'title' : 'small'} weight="800" tone="ink">
          {level}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    ...StyleSheet.absoluteFill,
    borderWidth: BORDER,
    borderColor: tokens.color.surfaceStrong,
  },
  progress: {
    ...StyleSheet.absoluteFill,
    borderWidth: BORDER,
    borderTopColor: tokens.color.gold,
    borderRightColor: tokens.color.gold,
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  inner: {
    ...StyleSheet.absoluteFill,
    backgroundColor: tokens.color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
