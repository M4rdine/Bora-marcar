import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokens } from './tokens';

/**
 * Espaço reservado no rodapé do conteúdo rolável das telas de abas para a barra flutuante não
 * cobrir o último item (a barra fica fora do fluxo, com `position: 'absolute'`).
 *
 * A barra flutua a `space[3]` do fundo e tem `size.tabBar` de altura, mas o fundo dela é a borda
 * física da tela: em aparelhos com indicador de home o sistema ainda reserva `insets.bottom`
 * abaixo. Sem somar esse inset, o último bloco da rolagem fica sob a barra — foi o que escondeu
 * o eixo e a legenda do gráfico horário na Home.
 */
export function useScreenPaddingBottom(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + tokens.space[3] + tokens.size.tabBar + tokens.space[4];
}
