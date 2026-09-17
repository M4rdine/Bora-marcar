import { ALL_FONT_FAMILIES, fontFamily } from './typography';
import { APP_FONTS } from './useAppFonts';

const WEIGHTS = ['400', '500', '600', '700', '800', '900'] as const;

describe('typography', () => {
  it('toda combinação de papel e peso devolve uma família de verdade', () => {
    for (const role of ['display', 'text'] as const) {
      for (const weight of WEIGHTS) {
        expect(fontFamily(role, weight)).toMatch(/^(Archivo|Manrope)_\d{3}[A-Za-z]+$/);
      }
    }
  });

  it('os dois papéis falam com famílias diferentes: é o par que cria hierarquia', () => {
    for (const weight of WEIGHTS) {
      expect(fontFamily('display', weight)).toMatch(/^Archivo_/);
      expect(fontFamily('text', weight)).toMatch(/^Manrope_/);
    }
  });

  it('peso maior nunca devolve família mais leve', () => {
    for (const role of ['display', 'text'] as const) {
      const numbers = WEIGHTS.map((w) => Number(fontFamily(role, w).match(/_(\d{3})/)?.[1]));
      for (let i = 1; i < numbers.length; i += 1) {
        expect(numbers[i] as number).toBeGreaterThanOrEqual(numbers[i - 1] as number);
      }
    }
  });

  /**
   * O contrato que realmente importa: pedir uma família que ninguém carregou faz o React Native
   * cair na fonte do sistema sem avisar, que é o defeito que esta rodada veio consertar.
   */
  it('toda família pedida está carregada por useAppFonts', () => {
    const loaded = new Set(Object.keys(APP_FONTS));
    for (const family of ALL_FONT_FAMILIES) {
      expect(loaded.has(family)).toBe(true);
    }
  });

  it('e nenhuma família é carregada sem ser usada', () => {
    const requested = new Set(ALL_FONT_FAMILIES);
    for (const family of Object.keys(APP_FONTS)) {
      expect(requested.has(family)).toBe(true);
    }
  });

  it('a lista de famílias não tem repetição', () => {
    expect(new Set(ALL_FONT_FAMILIES).size).toBe(ALL_FONT_FAMILIES.length);
  });
});
