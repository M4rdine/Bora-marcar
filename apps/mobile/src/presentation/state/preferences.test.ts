import { saoPaulo } from '@/application/testing/fakes';

import { MAX_FAVORITES, MAX_RECENTS, addRecent, isFavorite, toggleFavorite } from './preferences';

const city = (id: string) => ({ ...saoPaulo, id, name: `Cidade ${id}` });

describe('preferências', () => {
  it('recente vai para o topo, sem duplicar e sem passar de 5', () => {
    const r1 = addRecent([], city('a'), []);
    const r2 = addRecent(r1, city('b'), []);
    const r3 = addRecent(r2, city('a'), []);
    expect(r3.map((c) => c.id)).toEqual(['a', 'b']);
    const many = ['1', '2', '3', '4', '5', '6'].reduce(
      (acc, id) => addRecent(acc, city(id), []),
      [] as readonly (typeof saoPaulo)[],
    );
    expect(many).toHaveLength(MAX_RECENTS);
    expect(many[0]?.id).toBe('6');
  });

  it('cidade favorita não entra nos recentes', () => {
    expect(addRecent([], city('a'), [city('a')])).toEqual([]);
  });

  it('toggleFavorite adiciona, remove e respeita o máximo', () => {
    const on = toggleFavorite([], city('a'));
    expect(isFavorite(on, city('a'))).toBe(true);
    expect(toggleFavorite(on, city('a'))).toEqual([]);
    const full = Array.from({ length: MAX_FAVORITES }, (_, i) => city(String(i)));
    expect(toggleFavorite(full, city('extra'))).toEqual(full);
  });
});
