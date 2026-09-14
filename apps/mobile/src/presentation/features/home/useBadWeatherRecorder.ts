import { useEffect } from 'react';

import type { DayRecommendation } from '@/domain';

import { useServices } from '../../services/ServicesProvider';

/** Registra "dia de folga por mau tempo" quando hoje não tem janela boa (idempotente no caso de uso). */
export function useBadWeatherRecorder(
  cityId: string | null,
  today: DayRecommendation | null,
): void {
  const services = useServices();
  const noWindow = today !== null && today.result.kind === 'none' && today.hours.length > 0;
  const bestScore = today?.score ?? 0;
  const date = today?.date ?? null;
  useEffect(() => {
    if (!noWindow || cityId === null || date === null) return;
    void services.recordBadWeatherDay({ cityId, date, bestScore });
  }, [services, noWindow, cityId, date, bestScore]);
}
