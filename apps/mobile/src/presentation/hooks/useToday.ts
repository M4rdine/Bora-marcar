import { localNow } from '@/domain';

import { useServices } from '../services/ServicesProvider';
import { usePreferences } from '../state/preferencesStore';

const deviceOffsetSeconds = (): number => -new Date().getTimezoneOffset() * 60;

/** "Hoje" no fuso da cidade da última previsão; sem previsão, no fuso do aparelho. */
export function useToday(): { date: string; utcOffsetSeconds: number | null } {
  const services = useServices();
  const last = usePreferences((s) => s.lastForecast);
  const offset = last?.utcOffsetSeconds ?? deviceOffsetSeconds();
  return {
    date: localNow(services.ports.clock.now(), offset).date,
    utcOffsetSeconds: last?.utcOffsetSeconds ?? null,
  };
}
