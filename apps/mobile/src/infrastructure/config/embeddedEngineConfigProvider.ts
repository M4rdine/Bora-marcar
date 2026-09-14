import type { EngineConfigProvider } from '@/application/ports';
import { defaultEngineConfig } from '@/domain';

export const embeddedEngineConfigProvider = (): EngineConfigProvider => ({
  get: async () => defaultEngineConfig,
});
