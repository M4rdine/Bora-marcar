import { ACTIVITY_IDS, defaultEngineConfig } from '@/domain';

import { activityIcon } from './activityIcon';
import { ICON_SHAPES } from './paths';

describe('activityIcon', () => {
  it('toda atividade do domínio tem um desenho', () => {
    for (const id of ACTIVITY_IDS) {
      expect(ICON_SHAPES[activityIcon(id)]).toBeDefined();
      expect(ICON_SHAPES[activityIcon(id)].length).toBeGreaterThan(0);
    }
  });

  it('cada atividade tem o SEU desenho: cinco ícones para cinco atividades', () => {
    const icons = ACTIVITY_IDS.map(activityIcon);
    expect(new Set(icons).size).toBe(ACTIVITY_IDS.length);
  });

  /**
   * O contrato de camada. O domínio carregava um campo de aparência ao lado do peso de
   * temperatura e do limite de vento; se ele voltar, a identidade visual volta a morar numa
   * configuração de motor de pontuação e este teste quebra antes de chegar na tela.
   */
  it('o domínio não guarda aparência: o perfil da atividade não tem campo visual', () => {
    for (const id of ACTIVITY_IDS) {
      const profile = defaultEngineConfig.activities[id] as Record<string, unknown>;
      expect(Object.keys(profile)).not.toContain('emoji');
      expect(Object.keys(profile)).not.toContain('icon');
      expect(Object.keys(profile)).not.toContain('color');
    }
  });
});
