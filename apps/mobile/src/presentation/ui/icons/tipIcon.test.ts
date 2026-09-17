import type { TipId } from '@/domain';

import { ICON_SHAPES } from './paths';
import { tipIcon } from './tipIcon';

const TIP_IDS: readonly TipId[] = ['sunscreen', 'water', 'cooling', 'rain', 'coat'];

describe('tipIcon', () => {
  it('toda dica tem um desenho', () => {
    for (const id of TIP_IDS) {
      expect(ICON_SHAPES[tipIcon(id)]).toBeDefined();
      expect(ICON_SHAPES[tipIcon(id)].length).toBeGreaterThan(0);
    }
  });

  /**
   * O defeito que o mapa de emoji tinha: "esfriar" e "casaco" carregavam o MESMO casaco, embora
   * uma dica seja para calor e a outra para frio.
   */
  it('cada dica tem o SEU desenho', () => {
    const icons = TIP_IDS.map(tipIcon);
    expect(new Set(icons).size).toBe(TIP_IDS.length);
  });

  it('calor e frio não desenham igual', () => {
    expect(tipIcon('cooling')).not.toBe(tipIcon('coat'));
  });
});
