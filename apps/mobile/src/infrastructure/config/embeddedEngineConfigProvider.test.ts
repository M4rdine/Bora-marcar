import { defaultEngineConfig } from '@/domain';

import { embeddedEngineConfigProvider } from './embeddedEngineConfigProvider';

it('devolve a config embutida', async () => {
  await expect(embeddedEngineConfigProvider().get()).resolves.toBe(defaultEngineConfig);
});
