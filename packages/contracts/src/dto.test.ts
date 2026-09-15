import { describe, expect, it } from 'vitest';

import { cityDtoSchema, forecastDtoSchema } from './dto';
import { mapCity } from './openMeteo/mapCity';
import { mapForecast } from './openMeteo/mapForecast';
import { forecastSaoPaulo, geocodingSaoPaulo } from './testing';

describe('DTOs do BFF', () => {
  it('a previsão mapeada da fixture real passa no forecastDtoSchema', () => {
    const dto = mapForecast(forecastSaoPaulo);
    expect(forecastDtoSchema.parse(dto)).toEqual(dto);
    expect(dto.hourly).toHaveLength(120);
    expect(dto.hourly[0]).toMatchObject({ date: '2026-09-14', hour: 0 });
  });

  it('cada cidade mapeada da fixture real passa no cityDtoSchema', () => {
    for (const raw of geocodingSaoPaulo.results ?? []) {
      const dto = mapCity(raw);
      expect(cityDtoSchema.parse(dto)).toEqual(dto);
    }
  });

  it('rejeita previsão com hora fora de 0–23', () => {
    const dto = mapForecast(forecastSaoPaulo);
    const first = dto.hourly[0];
    if (!first) throw new Error('fixture vazia');
    const broken = { ...dto, hourly: [{ ...first, hour: 24 }, ...dto.hourly.slice(1)] };
    expect(forecastDtoSchema.safeParse(broken).success).toBe(false);
  });
});
