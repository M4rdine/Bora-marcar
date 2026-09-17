import { ICON_SHAPES } from '../ui/icons/paths';

import { weatherGlyph } from './weatherGlyph';

describe('weatherGlyph', () => {
  it.each([
    [0, 'clear', 'céu limpo'],
    [1, 'fewClouds', 'poucas nuvens'],
    [2, 'fewClouds', 'poucas nuvens'],
    [3, 'cloudy', 'nublado'],
    [45, 'fog', 'nevoeiro'],
    [48, 'fog', 'nevoeiro'],
    [53, 'drizzle', 'garoa'],
    [63, 'rain', 'chuva'],
    [81, 'showers', 'pancadas'],
    [73, 'snow', 'neve'],
    [85, 'snow', 'neve'],
    [96, 'thunder', 'trovoada'],
  ])('código %i → %s (%s)', (code, icon, summary) => {
    expect(weatherGlyph(code)).toEqual({ icon, summary });
  });

  it('código desconhecido devolve o fallback', () => {
    expect(weatherGlyph(-1)).toEqual({ icon: 'cloudy', summary: 'sem dados' });
  });

  it('todo ícone de tempo existe no conjunto desenhado', () => {
    const codes = [0, 1, 2, 3, 45, 48, 53, 63, 81, 73, 85, 96, -1];
    for (const code of codes) {
      expect(ICON_SHAPES[weatherGlyph(code).icon]).toBeDefined();
      expect(ICON_SHAPES[weatherGlyph(code).icon].length).toBeGreaterThan(0);
    }
  });

  it('à noite, céu limpo vira lua em vez de sol', () => {
    expect(weatherGlyph(0, false)).toEqual({ icon: 'clearNight', summary: 'céu limpo' });
    expect(weatherGlyph(1, false)).toEqual({ icon: 'fewCloudsNight', summary: 'poucas nuvens' });
  });

  it('o que não depende de sol não muda à noite: nublado é nublado às 3h', () => {
    for (const code of [3, 45, 53, 63, 81, 73, 96]) {
      expect(weatherGlyph(code, false)).toEqual(weatherGlyph(code, true));
    }
  });

  it('sem informação de hora, assume dia — é o resumo de um dia inteiro', () => {
    expect(weatherGlyph(0)).toEqual(weatherGlyph(0, true));
  });

  it('os dois desenhos noturnos existem no conjunto', () => {
    for (const code of [0, 1, 2]) {
      const { icon } = weatherGlyph(code, false);
      expect(ICON_SHAPES[icon].length).toBeGreaterThan(0);
    }
  });
});
