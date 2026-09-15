import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from './motion';
import { AppText } from './Text';
import { tokens } from './tokens';
import { useReducedMotion } from './useReducedMotion';

type Props = {
  readonly progress: number;
  readonly left?: string;
  readonly right?: string;
};

/** Barra de progresso de nível com largura animada; movimento reduzido aplica o valor direto. */
export function LevelBar({ progress, left, right }: Props) {
  const clamped = Math.min(1, Math.max(0, progress));
  const reduced = useReducedMotion();
  const width = useSharedValue(clamped);

  useEffect(() => {
    if (reduced) {
      width.value = clamped;
      return;
    }
    width.value = withTiming(clamped, { duration: motion.normal, easing: motion.easing });
  }, [clamped, reduced, width]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
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
        <Animated.View testID="level-bar-fill" style={[styles.fill, fillStyle]} />
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
