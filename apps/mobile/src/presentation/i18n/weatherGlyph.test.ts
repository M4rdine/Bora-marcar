import { weatherGlyph } from './weatherGlyph';

describe('weatherGlyph', () => {
  it.each([
    [0, '☀️', 'céu limpo'],
    [1, '🌤', 'poucas nuvens'],
    [2, '🌤', 'poucas nuvens'],
    [3, '☁️', 'nublado'],
    [45, '🌫', 'nevoeiro'],
    [48, '🌫', 'nevoeiro'],
    [53, '🌦', 'garoa'],
    [63, '🌧', 'chuva'],
    [81, '🌧', 'pancadas'],
    [73, '🌨', 'neve'],
    [85, '🌨', 'neve'],
    [96, '⛈', 'trovoada'],
  ])('código %i → %s %s', (code, emoji, summary) => {
    expect(weatherGlyph(code)).toEqual({ emoji, summary });
  });

  it('código desconhecido devolve o fallback', () => {
    expect(weatherGlyph(-1)).toEqual({ emoji: '🌡', summary: 'sem dados' });
  });
});
