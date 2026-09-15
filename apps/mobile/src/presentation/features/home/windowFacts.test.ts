import { makeHourScore } from '@/domain/recommendation/testing/fixtures';

import { hoursInWindow, windowFacts } from './windowFacts';

it('faz a média arredondada dos fatores da janela', () => {
  const a = makeHourScore(17, 90);
  const b = makeHourScore(18, 96);
  const hours = [
    {
      ...a,
      hour: {
        ...a.hour,
        apparentTemperature: 22.4,
        precipitationProbability: 5,
        windSpeedKmh: 9,
        uvIndex: 3,
      },
    },
    {
      ...b,
      hour: {
        ...b.hour,
        apparentTemperature: 23.4,
        precipitationProbability: 7,
        windSpeedKmh: 11,
        uvIndex: 4,
      },
    },
  ];
  expect(windowFacts(hours)).toEqual({ apparent: 23, rainPct: 6, windKmh: 10, uv: 4 });
});

it('lista vazia devolve zeros', () => {
  expect(windowFacts([])).toEqual({ apparent: 0, rainPct: 0, windKmh: 0, uv: 0 });
});

it('hoursInWindow filtra horas dentro de [startHour, endHour)', () => {
  const hours = Array.from({ length: 24 }, (_, hour) => makeHourScore(hour, 80));
  expect(hoursInWindow(hours, 17, 19).map((h) => h.hour.hour)).toEqual([17, 18]);
});

it('hoursInWindow com lista vazia devolve lista vazia', () => {
  expect(hoursInWindow([], 17, 19)).toEqual([]);
});
