import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { tokens } from '../tokens';

import { ICON_SHAPES, type IconName, type IconShape } from './paths';

const GRID = 24;
const STROKE = 2;

type Props = {
  readonly name: IconName;
  readonly size?: number;
  readonly color?: string;
  /** Rótulo para leitor de tela. Sem ele o ícone é decorativo e some da leitura, que é o certo
   * quando existe um texto ao lado dizendo a mesma coisa. */
  readonly label?: string;
};

function Shape({ shape, color }: { readonly shape: IconShape; readonly color: string }) {
  if (shape.kind === 'line') {
    return (
      <Line
        x1={shape.x1}
        y1={shape.y1}
        x2={shape.x2}
        y2={shape.y2}
        stroke={color}
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    );
  }
  if (shape.kind === 'circle') {
    return (
      <Circle
        cx={shape.cx}
        cy={shape.cy}
        r={shape.r}
        stroke={shape.fill ? 'none' : color}
        fill={shape.fill ? color : 'none'}
        strokeWidth={STROKE}
      />
    );
  }
  return (
    <Path
      d={shape.d}
      stroke={shape.fill ? 'none' : color}
      fill={shape.fill ? color : 'none'}
      // Par-ímpar para um caminho cheio poder ter buraco: dois contornos sobrepostos se cancelam.
      // É o que abre a língua interna da chama. Para um contorno só, é igual a não-zero.
      fillRule="evenodd"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/**
 * Um ícone do conjunto do app. O tamanho escala a grade de 24 inteira, então o traço engrossa
 * junto e o desenho não fica fino demais em 32 nem grosso demais em 16.
 */
function IconView({ name, size = 20, color = tokens.color.text, label }: Props) {
  const shapes = ICON_SHAPES[name];
  return (
    // A acessibilidade fica no `View`, não no `Svg`. Passadas ao `Svg`, as propriedades nativas
    // chegavam cruas ao DOM na versão web — dois erros de React por renderização — e o ícone
    // decorativo continuava exposto ao leitor de tela, que é o oposto do pretendido.
    <View
      {...(label === undefined
        ? {
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants' as const,
            'aria-hidden': true,
          }
        : { accessibilityRole: 'image' as const, accessibilityLabel: label })}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${GRID} ${GRID}`}>
        {shapes.map((shape, index) => (
          <Shape key={index} shape={shape} color={color} />
        ))}
      </Svg>
    </View>
  );
}

/** O desenho só depende de nome, tamanho e cor, então memoizar é sempre correto aqui. */
export const Icon = memo(IconView);
