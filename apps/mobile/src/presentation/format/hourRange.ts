const HOURS_IN_DAY = 24;

/**
 * Hora do relógio, sempre entre 0 e 23. O domínio trabalha com horas que podem passar de 24
 * (uma janela que atravessa a meia-noite), mas o relógio de ninguém marca 24h ou 25h.
 */
export function formatHour(hour: number): string {
  return `${((hour % HOURS_IN_DAY) + HOURS_IN_DAY) % HOURS_IN_DAY}h`;
}

/**
 * Rótulo de uma janela. `TimeWindow.endHour` é exclusivo, então uma janela boa das 21h às 23h
 * chega aqui como 21–24 e vira "21h – 00h": o fim do intervalo, não uma hora inexistente.
 */
export function formatHourRange(startHour: number, endHour: number): string {
  return `${formatHour(startHour)} – ${formatHour(endHour)}`;
}
