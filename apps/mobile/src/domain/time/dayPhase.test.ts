import { dayPhase } from './dayPhase';

// nascer 06:12 (372), pôr 18:04 (1084)
const sunrise = 372;
const sunset = 1084;

describe('dayPhase', () => {
  it.each([
    [5 * 60 + 11, 'night'], // 05:11, antes da janela do amanhecer
    [5 * 60 + 12, 'dawn'], // 05:12, uma hora antes do nascer
    [7 * 60 + 12, 'dawn'], // 07:12, uma hora depois do nascer
    [7 * 60 + 13, 'day'],
    [14 * 60, 'day'],
    [17 * 60 + 4, 'dusk'],
    [19 * 60 + 4, 'dusk'],
    [19 * 60 + 5, 'night'],
    [23 * 60, 'night'],
    [0, 'night'],
  ])('%i minutos → %s', (minutes, expected) => {
    expect(dayPhase(minutes, sunrise, sunset)).toBe(expected);
  });
});
