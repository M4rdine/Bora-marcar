import { describe, expect, it } from 'vitest';

import { engineConfigSchema } from './engineConfig';
import { validEngineConfig } from './testing/validEngineConfig';

const withWalk = (patch: Partial<(typeof validEngineConfig)['activities']['walk']>) => ({
  ...validEngineConfig,
  activities: {
    ...validEngineConfig.activities,
    walk: { ...validEngineConfig.activities.walk, ...patch },
  },
});

describe('engineConfigSchema', () => {
  it('aceita a config embutida sem alterar nada', () => {
    const parsed = engineConfigSchema.parse(validEngineConfig);
    expect(parsed).toEqual(validEngineConfig);
  });

  it('rejeita schemaVersion diferente de 1', () => {
    expect(engineConfigSchema.safeParse({ ...validEngineConfig, schemaVersion: 2 }).success).toBe(
      false,
    );
  });

  it.each([
    ['tolMin >= idealMin', { idealMin: 17, idealMax: 26, tolMin: 17, tolMax: 33 }],
    ['idealMin > idealMax', { idealMin: 27, idealMax: 26, tolMin: 8, tolMax: 33 }],
    ['idealMax >= tolMax', { idealMin: 17, idealMax: 33, tolMin: 8, tolMax: 33 }],
  ])('rejeita faixa térmica incoerente (%s)', (_, thermal) => {
    expect(engineConfigSchema.safeParse(withWalk({ thermal })).success).toBe(false);
  });

  it('rejeita pesos que não somam 1', () => {
    const weights = { thermal: 0.5, rain: 0.3, wind: 0.15, uv: 0.1, sun: 0.05, pressure: 0 };
    expect(engineConfigSchema.safeParse(withWalk({ weights })).success).toBe(false);
  });

  it('rejeita limite com ok >= max', () => {
    expect(engineConfigSchema.safeParse(withWalk({ wind: { ok: 45, max: 45 } })).success).toBe(
      false,
    );
  });

  it('rejeita id da atividade diferente da chave', () => {
    expect(engineConfigSchema.safeParse(withWalk({ id: 'run' })).success).toBe(false);
  });

  it('rejeita limiares de score fora de ordem', () => {
    const scores = { great: 60, good: 65, fair: 45 };
    expect(engineConfigSchema.safeParse({ ...validEngineConfig, scores }).success).toBe(false);
  });

  it.each([
    ['sizes vazio', { sizes: [] }],
    ['size zero', { sizes: [0, 1] }],
    ['size fracionário', { sizes: [1.5] }],
    ['quietHoursEnd 24', { quietHoursEnd: 24 }],
  ])('rejeita regra de janela inválida (%s)', (_, patch) => {
    const window = { ...validEngineConfig.window, ...patch };
    expect(engineConfigSchema.safeParse({ ...validEngineConfig, window }).success).toBe(false);
  });

  it.each([
    ['vazio', []],
    ['não começa em 0', [{ level: 1, xp: 10, name: 'A' }]],
    [
      'xp não cresce',
      [
        { level: 1, xp: 0, name: 'A' },
        { level: 2, xp: 0, name: 'B' },
      ],
    ],
    [
      'níveis não consecutivos',
      [
        { level: 1, xp: 0, name: 'A' },
        { level: 3, xp: 100, name: 'C' },
      ],
    ],
  ])('rejeita níveis inválidos (%s)', (_, levels) => {
    expect(engineConfigSchema.safeParse({ ...validEngineConfig, levels }).success).toBe(false);
  });

  it('rejeita campos desconhecidos no topo (config de outra versão)', () => {
    expect(engineConfigSchema.safeParse({ ...validEngineConfig, extra: 1 }).success).toBe(false);
  });
});
