import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { engineConfigSchema } from '@melhor-hora/contracts';

import { defaultEngineConfig } from '@/domain';

const PUBLISHED = join(__dirname, '../../../../../infra/assets/config/v1/engine.json');

describe('infra/assets/config/v1/engine.json', () => {
  it('é a config embutida, válida no schema (a remota começa igual à local)', () => {
    const published: unknown = JSON.parse(readFileSync(PUBLISHED, 'utf8'));
    expect(engineConfigSchema.parse(published)).toEqual(defaultEngineConfig);
  });
});
