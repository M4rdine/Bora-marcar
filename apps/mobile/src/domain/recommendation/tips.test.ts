import { defaultEngineConfig as cfg } from '../config/defaultEngineConfig';

import { makeDay } from './testing/fixtures';
import { preparationTips } from './tips';

const window = { date: '2026-09-13', startHour: 17, endHour: 19 };
const ids = (tips: readonly { id: string }[]) => tips.map((t) => t.id);

describe('preparationTips', () => {
  it('dia perfeito não gera dicas', () => {
    expect(preparationTips(makeDay('2026-09-13'), window, cfg)).toEqual([]);
  });

  it('protetor quando UV >= 6 na janela', () => {
    const day = makeDay('2026-09-13', (h) => ({ uvIndex: h === 18 ? 6 : 2 }));
    expect(preparationTips(day, window, cfg)).toEqual([{ id: 'sunscreen', text: 'Use protetor' }]);
  });

  it('água quando sensação >= 28 na janela', () => {
    const day = makeDay('2026-09-13', (h) => ({ apparentTemperature: h >= 17 ? 28 : 22 }));
    expect(ids(preparationTips(day, window, cfg))).toEqual(['water']);
  });

  it('esfria quando cai >= 4° até 2h após o fim', () => {
    const day = makeDay('2026-09-13', (h) => ({
      apparentTemperature: h <= 18 ? 22 : h === 19 ? 20 : 17,
    }));
    expect(preparationTips(day, window, cfg)).toEqual([{ id: 'cooling', text: 'Esfria às 20h' }]);
  });

  it('capa quando a hora seguinte tem chuva > 40%', () => {
    const day = makeDay('2026-09-13', (h) => ({ precipitationProbability: h === 19 ? 41 : 0 }));
    expect(ids(preparationTips(day, window, cfg))).toEqual(['rain']);
  });

  it('casaco quando sensação < 14 na janela', () => {
    const day = makeDay('2026-09-13', () => ({ apparentTemperature: 13 }));
    expect(ids(preparationTips(day, window, cfg))).toEqual(['coat']);
  });

  it('ordem fixa e sem duplicatas', () => {
    const day = makeDay('2026-09-13', (h) => ({
      uvIndex: 7,
      apparentTemperature: h <= 18 ? 29 : 20,
      precipitationProbability: h === 19 ? 50 : 0,
    }));
    expect(ids(preparationTips(day, window, cfg))).toEqual([
      'sunscreen',
      'water',
      'cooling',
      'rain',
    ]);
  });

  it('janela no fim do dia não quebra sem horas seguintes', () => {
    const day = makeDay('2026-09-13');
    expect(preparationTips(day, { date: '2026-09-13', startHour: 23, endHour: 24 }, cfg)).toEqual(
      [],
    );
  });

  it('sem horas no dia não gera dicas', () => {
    expect(preparationTips([], window, cfg)).toEqual([]);
  });

  it('não gera dicas nos limites exclusivos de chuva, esfriamento e casaco', () => {
    const rainDay = makeDay('2026-09-13', (h) => ({ precipitationProbability: h === 19 ? 40 : 0 }));
    expect(ids(preparationTips(rainDay, window, cfg))).not.toContain('rain');

    const coolingDay = makeDay('2026-09-13', (h) => ({
      apparentTemperature: h <= 18 ? 22 : h === 19 ? 19 : 22,
    }));
    expect(ids(preparationTips(coolingDay, window, cfg))).not.toContain('cooling');

    const coatDay = makeDay('2026-09-13', () => ({ apparentTemperature: 14 }));
    expect(ids(preparationTips(coatDay, window, cfg))).not.toContain('coat');
  });
});
