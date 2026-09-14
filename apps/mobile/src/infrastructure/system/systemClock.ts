import type { Clock } from '@/application/ports';

export const systemClock = (): Clock => ({ now: () => Date.now() });
