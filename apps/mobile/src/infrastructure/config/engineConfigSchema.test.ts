import { engineConfigSchema, type EngineConfigDto } from '@bora-marcar/contracts';

import { defaultEngineConfig, type EngineConfig } from '@/domain';

// Os dois tipos são estruturalmente iguais: o DTO do contrato é atribuível ao tipo do domínio e
// vice-versa. Se um dos lados ganhar um campo, este arquivo para de compilar.
const dtoToDomain: EngineConfig = {} as EngineConfigDto;
const domainToDto: EngineConfigDto = {} as EngineConfig;
void dtoToDomain;
void domainToDto;

describe('engine.json (contracts) × defaultEngineConfig (domínio)', () => {
  it('a config embutida é válida e sai idêntica do schema', () => {
    expect(engineConfigSchema.parse(defaultEngineConfig)).toEqual(defaultEngineConfig);
  });

  it('config malformada nunca chega ao motor: faixa térmica invertida é rejeitada', () => {
    const broken = {
      ...defaultEngineConfig,
      activities: {
        ...defaultEngineConfig.activities,
        walk: {
          ...defaultEngineConfig.activities.walk,
          thermal: { idealMin: 26, idealMax: 17, tolMin: 8, tolMax: 33 },
        },
      },
    };
    expect(engineConfigSchema.safeParse(broken).success).toBe(false);
  });
});
