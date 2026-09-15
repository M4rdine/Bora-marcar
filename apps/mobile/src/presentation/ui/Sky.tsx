import { LinearGradient } from 'expo-linear-gradient';
import { useLayoutEffect, useState } from 'react';
import { StyleSheet, type ViewProps } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { motion } from './motion';
import { tokens, type SkyPhase } from './tokens';
import { useReducedMotion } from './useReducedMotion';

type Props = ViewProps & { readonly phase: SkyPhase };

/**
 * Fundo de tela cheia. Troca de fase com crossfade: o gradiente anterior fica por baixo e o novo
 * entra com opacidade 0 → 1. Com movimento reduzido a troca é imediata.
 */
export function Sky({ phase, style, children, ...rest }: Props) {
  const reduced = useReducedMotion();
  const [previous, setPrevious] = useState<SkyPhase>(phase);
  const opacity = useSharedValue(1);

  // Movimento reduzido: adota a nova fase de imediato durante o render (sem efeito nem animação).
  if (reduced && phase !== previous) {
    setPrevious(phase);
  }

  // `useLayoutEffect` (e não `useEffect`): o zero da opacidade precisa valer no MESMO frame em
  // que o gradiente novo entra na árvore, senão ele aparece opaco por um frame antes do fade.
  useLayoutEffect(() => {
    if (reduced) return;
    if (phase === previous) return;
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: motion.sky, easing: motion.easing }, (done) => {
      if (done) runOnJS(setPrevious)(phase);
    });
  }, [phase, previous, reduced, opacity]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.fill, style]} {...rest}>
      <LinearGradient colors={tokens.gradients[previous]} style={StyleSheet.absoluteFill} />
      <Animated.View style={[StyleSheet.absoluteFill, fade]} pointerEvents="none">
        <LinearGradient colors={tokens.gradients[phase]} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
