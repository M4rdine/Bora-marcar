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
const FULL_TURN = 360;
const HALF_PROGRESS = 0.5;
/**
 * As quatro bordas de um círculo são arcos de 90° cujas fronteiras caem nas DIAGONAIS (45°, 135°,
 * 225°, 315°), então um par de bordas adjacentes desenha meio anel deslocado 45° do eixo
 * vertical. Este offset devolve esse meio anel ao eixo 12h–6h.
 */
const DIAGONAL_OFFSET = 45;

type HalfProps = {
  readonly side: 'left' | 'right';
  readonly size: number;
  /** Giro do meio anel dourado dentro da máscara, de 0° (nada visível) a 180° (metade cheia). */
  readonly degrees: number;
};

/**
 * Metade do anel: uma máscara que recorta meio círculo e, dentro dela, um anel completo com só
 * metade das bordas em dourado.
 *
 * Tomando 0° em 12h e girando no sentido horário, a máscara direita mostra o setor [0°, 180°] e a
 * esquerda o setor [180°, 360°]. O meio anel da máscara direita começa em [180°, 360°] (fora da
 * máscara, invisível); girado θ ele passa a ocupar [180°+θ, 360°+θ], cuja parte visível é
 * [0°, θ]. O da máscara esquerda começa em [0°, 180°] (também invisível ali) e, girado φ, mostra
 * [180°, 180°+φ]. Logo θ cobre os primeiros 50 % da volta e φ os 50 % restantes.
 */
function RingHalf({ side, size, degrees }: HalfProps) {
  const half = size / 2;
  const isRight = side === 'right';
  return (
    <View style={[styles.mask, { width: half, height: size, left: isRight ? half : 0 }]}>
      <View
        style={[
          styles.arc,
          isRight ? styles.arcStartsLeft : styles.arcStartsRight,
          {
            width: size,
            height: size,
            borderRadius: half,
            left: isRight ? -half : 0,
            transform: [{ rotate: `${DIAGONAL_OFFSET + degrees}deg` }],
          },
        ]}
      />
    </View>
  );
}

/** Anel de progresso sem SVG: trilho + dois meios anéis mascarados (ver `RingHalf`). */
export function LevelOrb({ level, name, progress, size = DEFAULT_SIZE }: Props) {
  const clamped = Math.min(1, Math.max(0, progress));
  const pct = Math.round(clamped * 100);
  const isLarge = size > DEFAULT_SIZE;
  const rightDegrees = Math.min(clamped, HALF_PROGRESS) * FULL_TURN;
  const leftDegrees = Math.max(0, clamped - HALF_PROGRESS) * FULL_TURN;
  return (
    <View
      accessible
      accessibilityLabel={t.level.aria(level, name, pct)}
      style={{ width: size, height: size }}
    >
      <View style={[styles.track, { borderRadius: size / 2 }]} />
      <RingHalf side="right" size={size} degrees={rightDegrees} />
      <RingHalf side="left" size={size} degrees={leftDegrees} />
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
  mask: { position: 'absolute', top: 0, overflow: 'hidden' },
  arc: { position: 'absolute', top: 0, borderWidth: BORDER },
  // Meio anel que, sem giro, ocupa o setor esquerdo — o que a máscara DIREITA esconde.
  arcStartsLeft: {
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: tokens.color.gold,
    borderLeftColor: tokens.color.gold,
  },
  // Meio anel que, sem giro, ocupa o setor direito — o que a máscara ESQUERDA esconde.
  arcStartsRight: {
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
