import { useEffect, useState } from 'react';

/**
 * `now` é injetado (em vez de chamar `Date.now()` direto) para que telas testadas com o relógio
 * falso do `AppServices` (`services.ports.clock.now`) recomputem um "agora" determinístico, sem
 * depender do relógio real da máquina que roda o teste.
 */
export function useNowTick(now: () => number, intervalMs = 60_000): number {
  const [tick, setTick] = useState(now);
  useEffect(() => {
    const id = setInterval(() => setTick(now()), intervalMs);
    return () => clearInterval(id);
  }, [now, intervalMs]);
  return tick;
}
