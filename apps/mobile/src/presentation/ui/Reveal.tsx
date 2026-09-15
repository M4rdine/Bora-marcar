import type { ReactNode } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { motion } from './motion';
import { useReducedMotion } from './useReducedMotion';

type Props = {
  readonly children: ReactNode;
};

/** Revela o conteúdo com um `FadeInDown`; sem animação com movimento reduzido. */
export function Reveal({ children }: Props) {
  const reduced = useReducedMotion();
  if (reduced) return <Animated.View>{children}</Animated.View>;
  return <Animated.View entering={FadeInDown.duration(motion.normal)}>{children}</Animated.View>;
}
