/** Epoch (ms) de um instante expresso em data/hora local de uma cidade com o offset dado. */
export function localEpochMs(
  date: string,
  hour: number,
  minute: number,
  utcOffsetSeconds: number,
): number {
  const asUtc = Date.parse(
    `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`,
  );
  return asUtc - utcOffsetSeconds * 1000;
}
