import { err, ok } from '@/domain';

import { fakeLocation, saoPaulo } from '../testing/fakes';

import { resolveMyLocation } from './resolveMyLocation';

describe('resolveMyLocation', () => {
  it('devolve a cidade do fix', async () => {
    const location = fakeLocation(
      ok({ coords: { latitude: -23.5, longitude: -46.6 }, city: saoPaulo }),
    );
    expect(await resolveMyLocation({ location })()).toEqual(ok(saoPaulo));
  });

  it('repassa negativa de permissão', async () => {
    expect(await resolveMyLocation({ location: fakeLocation(err({ code: 'denied' })) })()).toEqual(
      err({ code: 'denied' }),
    );
  });
});
