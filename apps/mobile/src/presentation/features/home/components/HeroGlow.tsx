import { StyleSheet, View } from 'react-native';

import { tokens } from '../../../ui';

/**
 * Anéis concêntricos com alfa decrescente que imitam o `radial-gradient` dourado do mockup
 * (`.hero::before`): sem SVG, o brilho se dissolve em vez de virar um disco opaco sobre o céu.
 * O centro fica fora do canto superior direito do cartão, que recorta o excesso.
 */
const RINGS = [
  { scale: 1.6, opacity: 0.05 },
  { scale: 1.25, opacity: 0.07 },
  { scale: 0.95, opacity: 0.1 },
  { scale: 0.65, opacity: 0.14 },
] as const;

const OFFSET = tokens.space[10];

export function HeroGlow() {
  return (
    <View pointerEvents="none" style={styles.anchor}>
      {RINGS.map(({ scale, opacity }) => {
        const diameter = tokens.size.glow * scale;
        return (
          <View
            key={scale}
            style={[
              styles.ring,
              {
                width: diameter,
                height: diameter,
                borderRadius: diameter / 2,
                left: -diameter / 2,
                top: -diameter / 2,
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', top: -OFFSET, right: -OFFSET, width: 0, height: 0 },
  ring: { position: 'absolute', backgroundColor: tokens.color.gold },
});
