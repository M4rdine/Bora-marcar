import { ACTIVITY_IDS, type ActivityId } from '@/domain';

import type { IconName } from './paths';

/**
 * Como cada atividade se parece.
 *
 * Isto vive na apresentação de propósito. O domínio carregava um campo `emoji` no perfil da
 * atividade, ao lado do peso de temperatura e do limite de vento — ou seja, a identidade visual do
 * app estava guardada numa configuração de motor de pontuação, e mudá-la exigia mexer no domínio.
 * O domínio continua dono do identificador; quem decide o desenho é quem desenha.
 */
const ICON_BY_ACTIVITY: Record<ActivityId, IconName> = {
  walk: 'walk',
  run: 'run',
  cycle: 'cycle',
  beach: 'beach',
  picnic: 'picnic',
  fish: 'fish',
};

export function activityIcon(id: ActivityId): IconName {
  return ICON_BY_ACTIVITY[id];
}

/** Toda atividade do domínio tem desenho. Serve de contrato para o teste. */
export const ACTIVITY_ICONS: readonly IconName[] = ACTIVITY_IDS.map(activityIcon);
