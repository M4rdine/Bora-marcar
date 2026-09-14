import { useEffect, useRef } from 'react';

import type { DayRecommendation } from '@/domain';

import { useServices } from '../../services/ServicesProvider';

/**
 * Registra "dia de folga por mau tempo" só quando o dia INTEIRO é ruim (melhor score do dia abaixo
 * do limiar "razoável"). `fairThreshold` nulo = config ainda carregando, então o efeito não dispara.
 * O `useRef` da última data registrada evita repetir a chamada quando a atividade ou o "agora"
 * mudam; a idempotência do caso de uso continua sendo a rede de segurança.
 */
export function useBadWeatherRecorder(
  cityId: string | null,
  today: DayRecommendation | null,
  fairThreshold: number | null,
): void {
  const services = useServices();
  const lastDate = useRef<string | null>(null);
  const isBadDay =
    today !== null &&
    today.hours.length > 0 &&
    today.bestScoreOfDay !== null &&
    fairThreshold !== null &&
    today.bestScoreOfDay < fairThreshold;
  const date = today?.date ?? null;
  const bestScore = today?.bestScoreOfDay ?? 0;
  useEffect(() => {
    if (!isBadDay || cityId === null || date === null) return;
    if (lastDate.current === date) return;
    lastDate.current = date;
    void services.recordBadWeatherDay({ cityId, date, bestScore });
  }, [services, isBadDay, cityId, date, bestScore]);
}
