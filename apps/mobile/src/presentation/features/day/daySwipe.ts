/** Para onde o arrasto leva. Arrastar para a ESQUERDA avança; para a direita, volta. */
export type SwipeDirection = 'next' | 'previous';

/**
 * O dia vizinho na lista de dias navegáveis, ou `null` quando não há para onde ir.
 *
 * Vive separado do gesto porque a regra é o que pode dar errado: o app mostra sete dias, e
 * arrastar no primeiro ou no último não pode navegar para lugar nenhum nem estourar a lista.
 */
export function neighbourDate(
  current: string,
  dates: readonly string[],
  direction: SwipeDirection,
): string | null {
  const index = dates.indexOf(current);
  if (index === -1) return null;
  const target = index + (direction === 'next' ? 1 : -1);
  return dates[target] ?? null;
}

/** Em que posição o dia atual está, para desenhar o indicador. `null` fora da lista. */
export function dayPosition(
  current: string,
  dates: readonly string[],
): { readonly index: number; readonly total: number } | null {
  const index = dates.indexOf(current);
  return index === -1 ? null : { index, total: dates.length };
}
