import { err, ok } from '@/domain';

import { fakeGeocoding, saoPaulo } from '../testing/fakes';

import { dedupeCities, searchCities } from './searchCities';

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

  it('remove o mesmo ponto devolvido com outro id (feature code), mantendo o primeiro', async () => {
    const twin = { ...saoPaulo, id: '999', latitude: saoPaulo.latitude + 0.01 };
    const other = { ...saoPaulo, id: '42', admin1: 'Coimbra', countryCode: 'PT' };
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

describe('dedupeCities', () => {
  it('lista vazia continua vazia', () => {
    expect(dedupeCities([])).toEqual([]);
  });

  it('homônimos no mesmo estado a 100 km um do outro são cidades diferentes', () => {
    const far = { ...saoPaulo, id: '7', latitude: saoPaulo.latitude - 0.9 };
    expect(dedupeCities([saoPaulo, far])).toEqual([saoPaulo, far]);
  });

  it('ignora diferença de caixa no nome e trata admin1 ausente como vazio', () => {
    const a = { ...saoPaulo, admin1: null };
    const b = { ...saoPaulo, id: '8', name: 'SÃO PAULO', admin1: null };
    expect(dedupeCities([a, b])).toEqual([a]);
  });
});
