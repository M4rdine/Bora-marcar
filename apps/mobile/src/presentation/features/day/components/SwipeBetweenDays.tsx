import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { motion, useReducedMotion } from '../../../ui';
import { neighbourDate, type SwipeDirection } from '../daySwipe';

type Props = {
  readonly date: string;
  /** Os dias navegáveis, em ordem. */
  readonly dates: readonly string[];
  readonly onGo: (date: string) => void;
  readonly children: ReactNode;
};

/** Quanto arrastar para a troca valer. Abaixo disto, o conteúdo volta para o lugar. */
const THRESHOLD = 64;
/** Velocidade que troca o dia mesmo sem alcançar o limiar, para o gesto curto e rápido. */
const FLING = 500;
/**
 * O quanto o conteúdo acompanha o dedo quando NÃO há para onde ir. Um quarto do arrasto é o
 * suficiente para a tela dizer "acabou aqui" sem parecer travada.
 */
const RESISTANCE = 0.25;
/** Eixo: só ativa depois de um movimento horizontal claro, e desiste se o dedo subir ou descer. */
const ACTIVATE_X = 24;
const FAIL_Y = 16;

/**
 * Arrastar para o lado troca o dia mostrado.
 *
 * Antes, ver o dia seguinte exigia voltar para a lista e escolher de novo — três toques para
 * comparar dois dias vizinhos, que é justamente o que alguém decidindo quando sair quer fazer.
 *
 * O gesto exige deslocamento horizontal antes de ativar e desiste no primeiro movimento vertical,
 * para não roubar a rolagem da página. Nas pontas da semana ele acompanha o dedo com resistência
 * e volta: a tela responde ao toque mesmo quando não há para onde ir.
 */
export function SwipeBetweenDays({ date, dates, onGo, children }: Props) {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const dx = useSharedValue(0);

  const canGo = (direction: SwipeDirection): boolean =>
    neighbourDate(date, dates, direction) !== null;

  const go = (direction: SwipeDirection): void => {
    const target = neighbourDate(date, dates, direction);
    if (target !== null) onGo(target);
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-ACTIVATE_X, ACTIVATE_X])
    .failOffsetY([-FAIL_Y, FAIL_Y])
    .onUpdate((e) => {
      const direction: SwipeDirection = e.translationX < 0 ? 'next' : 'previous';
      dx.value = e.translationX * (canGo(direction) ? 1 : RESISTANCE);
    })
    .onEnd((e) => {
      const direction: SwipeDirection = e.translationX < 0 ? 'next' : 'previous';
      const far = Math.abs(e.translationX) > THRESHOLD || Math.abs(e.velocityX) > FLING;
      if (far && canGo(direction)) {
        // Sai pelo lado para onde o dedo foi; a tela seguinte entra do zero.
        const exit = direction === 'next' ? -width : width;
        dx.value = reduced ? 0 : withTiming(exit, { duration: motion.fast, easing: motion.easing });
        runOnJS(go)(direction);
        return;
      }
      dx.value = withTiming(0, { duration: motion.normal, easing: motion.easing });
    });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: dx.value }] }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.fill, style]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
