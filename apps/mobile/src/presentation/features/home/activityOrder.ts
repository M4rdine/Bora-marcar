import { ACTIVITY_IDS, type ActivityId } from '@/domain';

/**
 * A ordem das abas de atividade: as preferidas primeiro, o resto depois.
 *
 * O onboarding pergunta de que a pessoa gosta e, até aqui, a resposta só decidia qual aba abria
 * marcada. Quem dizia gostar de praia e piquenique continuava vendo caminhada, corrida e ciclismo
 * na frente todo dia. A ordem é o único lugar onde essa preferência tem como aparecer sempre.
 *
 * O resto das atividades continua na lista, e na ordem do domínio: preferir não é esconder.
 */
export function activityOrder(favorites: readonly ActivityId[]): readonly ActivityId[] {
  const preferidas = ACTIVITY_IDS.filter((id) => favorites.includes(id)).sort(
    (a, b) => favorites.indexOf(a) - favorites.indexOf(b),
  );
  const restante = ACTIVITY_IDS.filter((id) => !favorites.includes(id));
  return [...preferidas, ...restante];
}
