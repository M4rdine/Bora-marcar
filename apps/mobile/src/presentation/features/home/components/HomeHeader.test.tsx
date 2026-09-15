import { saoPaulo } from '@/application/testing/fakes';

import { cityLabelOf } from './HomeHeader';

describe('cityLabelOf', () => {
  it('capital cujo estado repete o nome mostra o país', () => {
    expect(cityLabelOf(saoPaulo)).toBe('São Paulo, Brasil');
  });

  it('cidade do interior mostra o estado', () => {
    expect(cityLabelOf({ ...saoPaulo, name: 'Campinas' })).toBe('Campinas, São Paulo');
  });

  it('sem estado nem país (provider incompleto) mostra só o nome', () => {
    expect(cityLabelOf({ ...saoPaulo, admin1: null, country: '' })).toBe('São Paulo');
  });
});
