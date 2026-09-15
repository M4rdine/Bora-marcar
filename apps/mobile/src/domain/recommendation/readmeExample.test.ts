import { defaultEngineConfig as cfg } from '@/domain/config/defaultEngineConfig';
import { makeHour } from '@/domain/recommendation/testing/fixtures';

import { scoreHour } from './scoreHour';
import { buildSentence } from './sentence';

/**
 * Fixa os números do exemplo numérico usado no README ("Como o motor decide").
 * Se os valores de `defaultEngineConfig` ou das curvas de conforto mudarem, este
 * teste falha e o README precisa ser atualizado junto.
 */
describe('exemplo numérico do README', () => {
  it('caminhada às 16h, 24°, 10% de chuva, vento 12 km/h, UV 6, céu 30% nublado', () => {
    const hour = makeHour({
      hour: 16,
      apparentTemperature: 24,
      precipitationProbability: 10,
      precipitationMm: 0,
      windSpeedKmh: 12,
      uvIndex: 6,
      cloudCoverPct: 30,
      isDay: true,
    });

    const result = scoreHour(hour, cfg.activities.walk, cfg);

    expect(result.comforts).toEqual({
      thermal: 1,
      rain: 1,
      wind: 1,
      uv: 0.825,
      sun: 1,
    });
    expect(result.score).toBe(98);
    expect(result.label).toBe('great');
    expect(result.veto).toBeNull();

    const sentence = buildSentence([result], cfg.activities.walk);
    expect(sentence).toBe('Sensação de 24°, baixa chance de chuva e vento leve.');
  });
});
