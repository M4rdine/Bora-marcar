import { err, ok } from '@/domain';

import { fakeGeocoding, saoPaulo } from '../testing/fakes';

import { searchCities } from './searchCities';

describe('searchCities', () => {
  it('com menos de 2 caracteres devolve vazio sem consultar o provider', async () => {
    const geocoding = fakeGeocoding();
    const result = await searchCities({ geocoding })(' s ');
    expect(result).toEqual(ok([]));
    expect(geocoding.calls).toEqual([]);
  });

  it('normaliza espaços e repassa a consulta', async () => {
    const geocoding = fakeGeocoding(ok([saoPaulo]));
    const result = await searchCities({ geocoding })('  São Paulo ');
    expect(result).toEqual(ok([saoPaulo]));
    expect(geocoding.calls).toEqual(['São Paulo']);
  });

  it('remove duplicatas de nome + estado + país, mantendo a primeira', async () => {
    const twin = { ...saoPaulo, id: '999', latitude: -23.6 };
    const other = {
      ...saoPaulo,
      id: '42',
      name: 'São Paulo',
      admin1: 'Coimbra',
      countryCode: 'PT',
    };
    const geocoding = fakeGeocoding(ok([saoPaulo, twin, other]));
    const result = await searchCities({ geocoding })('São Paulo');
    expect(result).toEqual(ok([saoPaulo, other]));
  });

  it('repassa erro do provider', async () => {
    const failure = err({ code: 'network' as const, message: 'offline' });
    const result = await searchCities({ geocoding: fakeGeocoding(failure) })('Rio');
    expect(result).toEqual(failure);
  });
});
