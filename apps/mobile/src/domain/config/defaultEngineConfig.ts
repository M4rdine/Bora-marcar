import type { EngineConfig } from './types';

export const defaultEngineConfig: EngineConfig = {
  schemaVersion: 1,
  activities: {
    walk: {
      id: 'walk',
      name: 'Caminhada',
      thermal: { idealMin: 17, idealMax: 26, tolMin: 8, tolMax: 33 },
      wind: { ok: 20, max: 45 },
      uv: { ok: 5, max: 9 },
      nightFactor: 0.7,
      weights: { thermal: 0.4, rain: 0.3, wind: 0.15, uv: 0.1, sun: 0.05, pressure: 0 },
    },
    run: {
      id: 'run',
      name: 'Corrida',
      thermal: { idealMin: 12, idealMax: 21, tolMin: 3, tolMax: 29 },
      wind: { ok: 20, max: 45 },
      uv: { ok: 5, max: 9 },
      nightFactor: 0.6,
      weights: { thermal: 0.45, rain: 0.25, wind: 0.15, uv: 0.15, sun: 0, pressure: 0 },
    },
    cycle: {
      id: 'cycle',
      name: 'Ciclismo',
      thermal: { idealMin: 15, idealMax: 25, tolMin: 6, tolMax: 32 },
      wind: { ok: 15, max: 35 },
      uv: { ok: 5, max: 9 },
      nightFactor: 0.3,
      weights: { thermal: 0.3, rain: 0.3, wind: 0.3, uv: 0.1, sun: 0, pressure: 0 },
    },
    beach: {
      id: 'beach',
      name: 'Praia',
      thermal: { idealMin: 25, idealMax: 32, tolMin: 20, tolMax: 38 },
      wind: { ok: 15, max: 35 },
      uv: { ok: 6, max: 10 },
      nightFactor: 0,
      weights: { thermal: 0.3, rain: 0.25, wind: 0.15, uv: 0.1, sun: 0.2, pressure: 0 },
    },
    picnic: {
      id: 'picnic',
      name: 'Piquenique',
      thermal: { idealMin: 19, idealMax: 27, tolMin: 12, tolMax: 33 },
      wind: { ok: 15, max: 40 },
      uv: { ok: 5, max: 9 },
      nightFactor: 0.2,
      weights: { thermal: 0.35, rain: 0.35, wind: 0.15, uv: 0.05, sun: 0.1, pressure: 0 },
    },
    /**
     * Pesca é o perfil que mais se afasta dos outros, e é por isso que ela entrou.
     *
     * Ela é a única que pesa a PRESSÃO, e pesa muito: pressão caindo anuncia frente chegando, e é
     * quando o peixe sobe para se alimentar. Também é a única indiferente ao sol — nuvem não
     * atrapalha quem está na margem — e a que menos tolera vento, porque vento estraga a leitura
     * da linha antes de estragar o conforto de quem pesca.
     *
     * A faixa térmica é a mais ampla do conjunto: ficar parado à sombra aguenta calor que uma
     * corrida não aguenta. E o fator noturno é alto, não baixo: pescar de madrugada é comum.
     */
    fish: {
      id: 'fish',
      name: 'Pesca',
      thermal: { idealMin: 16, idealMax: 30, tolMin: 6, tolMax: 38 },
      wind: { ok: 8, max: 25 },
      uv: { ok: 6, max: 10 },
      nightFactor: 0.85,
      weights: { thermal: 0.15, rain: 0.2, wind: 0.25, uv: 0.05, sun: 0, pressure: 0.35 },
    },
  },
  scores: { great: 80, good: 65, fair: 45 },
  window: {
    sizes: [1, 2, 3],
    minHourScore: 45,
    lengthBonus: 3,
    minRemainingMinutes: 30,
    graceHoursAfterEnd: 2,
    quietHoursEnd: 5,
  },
  tips: { uvProtect: 6, waterApparent: 28, coolDropDeg: 4, rainNextPct: 40, coatApparent: 14 },
  xp: { base: 50, planBonus: 25, streakPerDay: 5, streakMaxDays: 10 },
  levels: [
    { level: 1, xp: 0, name: 'Brisa' },
    { level: 2, xp: 100, name: 'Garoa' },
    { level: 3, xp: 400, name: 'Sol' },
    { level: 4, xp: 900, name: 'Ventania' },
    { level: 5, xp: 1600, name: 'Aurora' },
    { level: 6, xp: 2500, name: 'Tempestade' },
    { level: 7, xp: 3600, name: 'Furacão' },
    { level: 8, xp: 4900, name: 'Clima Perfeito' },
  ],
};
