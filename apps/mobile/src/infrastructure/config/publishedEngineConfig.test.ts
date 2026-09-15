import { engineConfigSchema } from '@melhor-hora/contracts';

import published from '../../../../../infra/assets/config/v1/engine.json';

// Só o schema: a config remota existe justamente para poder divergir da embutida (ADR 0005).
describe('infra/assets/config/v1/engine.json', () => {
  it('passa no engineConfigSchema (schema e invariantes)', () => {
    // `parse` (e não `safeParse`) para o CI mostrar qual invariante quebrou.
    expect(() => engineConfigSchema.parse(published)).not.toThrow();
  });
});
