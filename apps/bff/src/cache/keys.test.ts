import { describe, expect, it } from 'vitest';

import { forecastKey, geoKey, rateKey } from './keys';

describe('chaves de cache (spec 7.2)', () => {
  it('geo normaliza espaços, caixa e acentos compostos', () => {
    expect(geoKey('pt', '  São   Paulo ')).toBe('geo:v1:pt:são paulo');
    expect(geoKey('pt', 'São Paulo')).toBe('geo:v1:pt:são paulo');
  });
  it('forecast arredonda para 2 casas', () => {
    expect(forecastKey(-23.5475, -46.63611)).toBe('fc:v1:-23.55:-46.64');
    expect(forecastKey(0, 0)).toBe('fc:v1:0.00:0.00');
  });
  it('rate limit por ip', () => {
    expect(rateKey('10.0.0.1')).toBe('rl:v1:10.0.0.1');
  });
});
