import { makeHourScore } from '@/domain/recommendation/testing/fixtures';

import { windowFacts } from './windowFacts';

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
