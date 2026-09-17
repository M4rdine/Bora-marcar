import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';

type Input = {
  /** Chave da conquista revelada agora, ou `null` quando não há nada a revelar. */
  readonly rewardKey: string | null;
  readonly scrollRef: RefObject<ScrollView | null>;
  /** Altura visível da área rolável. */
  readonly visibleHeight: number;
  /** Espaço que a barra de abas flutuante ocupa sobre o fim do conteúdo. */
  readonly reservedBottom: number;
};

type Reveal = {
  /** Ligar no bloco que cresce quando a recompensa aparece. */
  readonly onLayout: (event: LayoutChangeEvent) => void;
};

/**
 * Enquadra a recompensa recém-conquistada sem esconder a próxima ação.
 *
 * O cartão da conquista nasce no fim do bloco do herói, e a barra de abas flutua sobre o fim da
 * tela. Rolar para o topo mostrava a conquista e cobria o botão seguinte em 83%; o alvo certo é o
 * fim do bloco logo acima da barra.
 *
 * O detalhe que fez a primeira tentativa não rolar nunca: a medida do bloco só existe DEPOIS que
 * ele cresceu. Lida no instante em que a conquista aparece, ela ainda era a do estado anterior
 * (685 em vez de 834), o alvo dava zero e nenhuma rolagem acontecia. Por isso aqui a medida é
 * estado, e não referência: a rolagem espera a medida tirada já com a recompensa na tela.
 */
export function useRevealReward({
  rewardKey,
  scrollRef,
  visibleHeight,
  reservedBottom,
}: Input): Reveal {
  // Medida tirada com a recompensa já montada. Zero significa "ainda não medido".
  const [rewardBottom, setRewardBottom] = useState(0);
  const revealed = useRef<string | null>(null);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (rewardKey === null) return;
      const { y, height } = event.nativeEvent.layout;
      setRewardBottom(y + height);
    },
    [rewardKey],
  );

  useEffect(() => {
    if (rewardKey === null) {
      revealed.current = null;
      return;
    }
    if (rewardBottom === 0 || revealed.current === rewardKey) return;
    revealed.current = rewardKey;
    scrollRef.current?.scrollTo({
      y: Math.max(0, rewardBottom - visibleHeight + reservedBottom),
      animated: true,
    });
  }, [rewardKey, rewardBottom, scrollRef, visibleHeight, reservedBottom]);

  return { onLayout };
}
