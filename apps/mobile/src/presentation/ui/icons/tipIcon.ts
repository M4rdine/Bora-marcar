import type { TipId } from '@/domain';

import type { IconName } from './paths';

/**
 * Como cada dica se parece.
 *
 * Mora aqui pelo mesmo motivo que `activityIcon`: quem decide o desenho é quem desenha. Antes o
 * mapa vivia no arquivo de textos, em emoji do sistema — e a dica de água mostrava 💧 a sessenta
 * pixels da gota VETORIAL da linha de fatos, no mesmo cartão. Dois desenhos da mesma coisa, um
 * deles emprestado do sistema operacional.
 *
 * "Esfriar" e "casaco" carregavam o MESMO emoji de casaco, embora signifiquem o oposto: uma dica
 * é para calor, a outra para frio. Agora são o termômetro e a neve.
 */
const ICON_BY_TIP: Record<TipId, IconName> = {
  sunscreen: 'uv',
  water: 'drop',
  cooling: 'thermal',
  rain: 'rain',
  coat: 'snow',
};

export function tipIcon(id: TipId): IconName {
  return ICON_BY_TIP[id];
}
