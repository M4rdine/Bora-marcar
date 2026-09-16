import type { LocalDateTime } from '@/domain';

/**
 * O que está em jogo hoje na sequência. Uma sequência só prende atenção quando dá para perdê-la,
 * e quando a pessoa vê quanto tempo falta para isso acontecer.
 */
export type StreakRisk =
  /** Já registrou hoje: a sequência de hoje está garantida. */
  | { readonly kind: 'secured'; readonly streak: number }
  /** Dia de folga por clima ruim: não registrar hoje não quebra nada. */
  | { readonly kind: 'protected'; readonly streak: number }
  /** Tem sequência, ainda não registrou e o dia está acabando. */
  | { readonly kind: 'atRisk'; readonly streak: number; readonly minutesLeft: number }
  /** Sem sequência: não há o que perder, há o que começar. */
  | { readonly kind: 'idle' };

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

type Input = {
  readonly streak: number;
  readonly doneToday: boolean;
  readonly restToday: boolean;
  readonly now: LocalDateTime;
};

/** Minutos até a virada do dia, que é quando uma sequência não registrada se perde. */
export function minutesUntilMidnight(now: LocalDateTime): number {
  return MINUTES_PER_DAY - (now.hour * MINUTES_PER_HOUR + now.minute);
}

export function deriveStreakRisk({ streak, doneToday, restToday, now }: Input): StreakRisk {
  if (doneToday) return { kind: 'secured', streak };
  if (restToday) return { kind: 'protected', streak };
  if (streak <= 0) return { kind: 'idle' };
  return { kind: 'atRisk', streak, minutesLeft: minutesUntilMidnight(now) };
}

/** Horas e minutos restantes, para o rótulo da contagem regressiva. */
export function splitMinutes(total: number): { readonly hours: number; readonly minutes: number } {
  return {
    hours: Math.floor(total / MINUTES_PER_HOUR),
    minutes: total % MINUTES_PER_HOUR,
  };
}
