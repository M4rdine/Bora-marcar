import { tokens } from './tokens';

/**
 * Espaço reservado no rodapé do conteúdo rolável das telas de abas para a barra flutuante não
 * cobrir o último item (a barra fica fora do fluxo, com `position: 'absolute'`).
 */
export const screenPaddingBottom = tokens.size.tabBar + tokens.space[6];
