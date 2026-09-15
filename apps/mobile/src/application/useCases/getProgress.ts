import { deriveProgress, type Progress } from '@/domain';

import type { EngineConfigProvider, ProgressRepository } from '../ports';

type Deps = { readonly progress: ProgressRepository; readonly config: EngineConfigProvider };

export const getProgress =
  ({ progress, config }: Deps) =>
  async (today: string): Promise<Progress> =>
    deriveProgress(await progress.load(), await config.get(), today);
