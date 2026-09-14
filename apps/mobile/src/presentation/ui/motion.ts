import { Easing } from 'react-native-reanimated';

export const motion = {
  fast: 150,
  normal: 300,
  sky: 600,
  count: 900,
  easing: Easing.out(Easing.cubic),
} as const;
