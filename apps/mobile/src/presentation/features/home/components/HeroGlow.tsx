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
/** Caixa da âncora = maior anel; filhos absolutos nunca saem dela (o Android não desenha filhos
 * fora de um pai de área zero de forma confiável). */
const BOX = tokens.size.glow * RINGS[0].scale;

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
                left: (BOX - diameter) / 2,
                top: (BOX - diameter) / 2,
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
  anchor: {
    position: 'absolute',
    top: -OFFSET - BOX / 2,
    right: -OFFSET - BOX / 2,
    width: BOX,
    height: BOX,
  },
  ring: { position: 'absolute', backgroundColor: tokens.color.gold },
});
