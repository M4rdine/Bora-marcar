import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokens } from './tokens';

/**
 * Espaço reservado no rodapé do conteúdo rolável das telas de abas, para a barra de navegação não
 * cobrir o último item. Ela fica fora do fluxo (`position: 'absolute'`), então nada é empurrado
 * por ela: quem reserva o espaço é a rolagem.
 *
 * A conta acompanha a barra: `size.tabBar` de altura mais o `insets.bottom` que ela engole ao
 * encostar na borda de baixo, mais um respiro. Enquanto a barra flutuava, havia um `space[3]` a
 * mais aqui — deixá-lo depois que ela encostou no fundo abriria um vão sob o último bloco.
 */
export function useScreenPaddingBottom(): number {
  const insets = useSafeAreaInsets();
  return tokens.size.tabBar + insets.bottom + tokens.space[4];
}
