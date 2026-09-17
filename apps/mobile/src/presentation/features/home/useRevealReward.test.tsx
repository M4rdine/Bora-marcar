import { renderHook, act } from '@testing-library/react-native';
import type { LayoutChangeEvent, ScrollView } from 'react-native';

import { useRevealReward } from './useRevealReward';

/** Medidas reais colhidas na tela: o herói tem 685 antes da conquista e 834 depois dela. */
const BEFORE = 685;
const AFTER = 834;
const VISIBLE = 844;
const RESERVED = 92;

function layout(bottom: number): LayoutChangeEvent {
  return {
    nativeEvent: { layout: { x: 0, y: 0, width: 390, height: bottom } },
  } as LayoutChangeEvent;
}

function setup() {
  const scrollTo = jest.fn();
  const scrollRef = { current: { scrollTo } as unknown as ScrollView };
  const view = renderHook(
    ({ rewardKey }: { rewardKey: string | null }) =>
      useRevealReward({ rewardKey, scrollRef, visibleHeight: VISIBLE, reservedBottom: RESERVED }),
    { initialProps: { rewardKey: null as string | null } },
  );
  return { scrollTo, view };
}

describe('useRevealReward', () => {
  it('sem recompensa, nenhuma rolagem acontece', () => {
    const { scrollTo, view } = setup();
    act(() => view.result.current.onLayout(layout(BEFORE)));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  /**
   * O teste que a primeira tentativa não tinha. Ela lia a medida no instante em que a conquista
   * aparecia — quando ela ainda era a de ANTES do crescimento — e calculava alvo zero, ou seja,
   * não rolava nunca. Aqui a medida velha está deliberadamente no lugar antes da virada.
   */
  it('rola com a medida tirada DEPOIS do bloco crescer, não com a de antes', () => {
    const { scrollTo, view } = setup();
    act(() => view.result.current.onLayout(layout(BEFORE)));

    act(() => view.rerender({ rewardKey: 'primeiro-plano' }));
    expect(scrollTo).not.toHaveBeenCalled();

    act(() => view.result.current.onLayout(layout(AFTER)));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ y: AFTER - VISIBLE + RESERVED, animated: true });
  });

  it('o alvo nunca é negativo quando o bloco cabe inteiro na tela', () => {
    const { scrollTo, view } = setup();
    act(() => view.rerender({ rewardKey: 'primeiro-plano' }));
    act(() => view.result.current.onLayout(layout(300)));
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it('remedir o mesmo bloco não sequestra a rolagem de novo', () => {
    const { scrollTo, view } = setup();
    act(() => view.rerender({ rewardKey: 'primeiro-plano' }));
    act(() => view.result.current.onLayout(layout(AFTER)));
    act(() => view.result.current.onLayout(layout(AFTER + 40)));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('uma segunda conquista, em outro dia, volta a enquadrar', () => {
    const { scrollTo, view } = setup();
    act(() => view.rerender({ rewardKey: 'primeiro-plano' }));
    act(() => view.result.current.onLayout(layout(AFTER)));
    act(() => view.rerender({ rewardKey: null }));
    act(() => view.rerender({ rewardKey: 'sequencia-3' }));
    act(() => view.result.current.onLayout(layout(AFTER)));
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });
});
