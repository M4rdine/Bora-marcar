import { render } from '@testing-library/react-native';

import { makeHourScore } from '@/domain/recommendation/testing/fixtures';
import { useReducedMotion } from '@/presentation/ui';

import { HourlyTimeline } from './HourlyTimeline';

jest.mock('@/presentation/ui/useReducedMotion', () => ({ useReducedMotion: jest.fn() }));

const mockedUseReducedMotion = useReducedMotion as jest.Mock;

const hours = Array.from({ length: 24 }, (_, hour) => makeHourScore(hour, 60));

describe('HourlyTimeline', () => {
  it.each([true, false])(
    'marca a hora "agora" com o contorno, animado ou estático (reduzido = %s)',
    (reduced) => {
      mockedUseReducedMotion.mockReturnValue(reduced);
      const { getByLabelText } = render(
        <HourlyTimeline hours={hours} nowHour={12} sunrise={null} sunset={null} />,
      );
      expect(getByLabelText(/12h:/)).toBeTruthy();
    },
  );

  it('sem hora atual não marca nenhuma barra', () => {
    mockedUseReducedMotion.mockReturnValue(true);
    const { queryByText } = render(
      <HourlyTimeline hours={hours} nowHour={null} sunrise={null} sunset={null} />,
    );
    expect(queryByText(/Agora:/)).toBeNull();
  });
});
