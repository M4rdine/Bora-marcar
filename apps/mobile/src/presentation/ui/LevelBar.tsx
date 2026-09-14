import { StyleSheet, View } from 'react-native';

import { AppText } from './Text';
import { tokens } from './tokens';

type Props = {
  readonly progress: number;
  readonly left?: string;
  readonly right?: string;
};

/** Barra de progresso de nível. Sem animação (chega na Task 10). */
export function LevelBar({ progress, left, right }: Props) {
  const clamped = Math.min(1, Math.max(0, progress));
  const hasLabels = left !== undefined || right !== undefined;
  return (
    <View style={styles.wrap}>
      {hasLabels ? (
        <View style={styles.labels}>
          <AppText variant="small">{left ?? ''}</AppText>
          <AppText variant="small" tone="muted">
            {right ?? ''}
          </AppText>
        </View>
      ) : null}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[1] },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  track: {
    height: tokens.space[2],
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.color.surface,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: tokens.radius.pill, backgroundColor: tokens.color.gold },
});
