import { localNow } from '@/domain';

import { useServices } from '../services/ServicesProvider';
import { usePreferences } from '../state/preferencesStore';
import { phaseFor, type SkyPhase } from '../ui';

const SECONDS_PER_MINUTE = 60;
const deviceOffsetSeconds = (): number => -new Date().getTimezoneOffset() * SECONDS_PER_MINUTE;

/**
 * Fase do céu para telas que não carregam previsão (Cidades, Perfil). O relógio vem da porta
 * injetada, como em `useToday`, e não de `Date.now()`: assim o valor é estável e testável.
 *
 * Usa o fuso da última previsão vista; sem ela, o do aparelho. Sem nascer e pôr do sol,
 * `phaseFor` cai no padrão de 6h e 18h — aproximação boa o bastante para a atmosfera, e
 * infinitamente melhor que uma fase fixa, que fazia o Perfil aparecer ao entardecer com a
 * Home em plena noite.
 */
export function useAmbientPhase(): SkyPhase {
  const services = useServices();
  const lastForecast = usePreferences((s) => s.lastForecast);
  const offsetSeconds = lastForecast?.utcOffsetSeconds ?? deviceOffsetSeconds();
  return phaseFor({
    now: localNow(services.ports.clock.now(), offsetSeconds),
    daily: null,
    isBadDay: false,
  });
}
