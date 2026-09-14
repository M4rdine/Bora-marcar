import { defaultEngineConfig, deriveProgress, type Progress } from '@/domain';

import type { ProgressRepository } from '../ports';

type Deps = { readonly progress: ProgressRepository };

export const getProgress =
  ({ progress }: Deps) =>
  async (today: string): Promise<Progress> =>
    deriveProgress(await progress.load(), defaultEngineConfig, today);
