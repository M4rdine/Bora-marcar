import { View, type ViewProps } from 'react-native';

import { tokens } from './tokens';

type Strength = 'soft' | 'strong' | 'shade';

type Props = ViewProps & {
  readonly strength?: Strength;
  readonly radius?: keyof typeof tokens.radius;
  readonly padding?: keyof typeof tokens.space;
  readonly gap?: keyof typeof tokens.space;
};

const BACKGROUND_BY_STRENGTH: Record<Strength, string> = {
  soft: tokens.color.surface,
  strong: tokens.color.surfaceStrong,
  shade: tokens.color.shade,
};

export function Surface({
  strength = 'soft',
  radius = 'card',
  padding,
  gap,
  style,
  ...rest
}: Props) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: BACKGROUND_BY_STRENGTH[strength],
          borderRadius: tokens.radius[radius],
          borderWidth: strength === 'strong' ? 1 : 0,
          borderColor: tokens.color.border,
          // O topo sempre ganha um realce, e ele vence o `borderWidth` acima porque no React
          // Native a propriedade específica tem precedência. É esse fio de luz que dá espessura
          // ao cartão e o faz ler como objeto em qualquer posição de rolagem, em vez de um
          // retângulo cuja cor é a do fundo naquele momento.
          borderTopWidth: 1,
          borderTopColor: tokens.color.surfaceEdge,
        },
        padding !== undefined && { padding: tokens.space[padding] },
        gap !== undefined && { gap: tokens.space[gap] },
        style,
      ]}
    />
  );
}
