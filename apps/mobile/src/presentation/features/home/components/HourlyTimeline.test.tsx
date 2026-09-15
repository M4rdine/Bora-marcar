import { render } from '@testing-library/react-native';

import { makeHourScore } from '@/domain/recommendation/testing/fixtures';
import { useReducedMotion } from '@/presentation/ui';

import { HourlyTimeline } from './HourlyTimeline';

jest.mock('@/presentation/ui/useReducedMotion', () => ({ useReducedMotion: jest.fn() }));

const mockedUseReducedMotion = useReducedMotion as jest.Mock;

const hours = Array.from({ length: 24 }, (_, hour) => makeHourScore(hour, 60));

describe('HourlyTimeline', () => {
  it.each([true, false])('marca só a hora "agora" com o contorno (reduzido = %s)', (reduced) => {
    mockedUseReducedMotion.mockReturnValue(reduced);
    const { getByLabelText, getAllByTestId } = render(
      <HourlyTimeline hours={hours} nowHour={12} sunrise={null} sunset={null} />,
    );
    expect(getByLabelText(/12h:/)).toBeTruthy();
    // Só a barra das 12h tem o contorno "agora"; as outras 23 não têm.
    expect(getAllByTestId('now-outline')).toHaveLength(1);
  });

  it('sem hora atual não marca nenhuma barra', () => {
    mockedUseReducedMotion.mockReturnValue(true);
    const { queryByText, queryByTestId } = render(
      <HourlyTimeline hours={hours} nowHour={null} sunrise={null} sunset={null} />,
    );
    expect(queryByText(/Agora:/)).toBeNull();
    expect(queryByTestId('now-outline')).toBeNull();
  });

  it('cancela o pulso do contorno ao desmontar, sem lançar erro', () => {
    // `react-native-reanimated` expõe `cancelAnimation` como export ESM não configurável neste
    // ambiente de teste (jest.spyOn falha com "Cannot redefine property"), então o teste exercita
    // o caminho de cleanup do efeito (linha coberta) e confirma que desmontar não lança.
    mockedUseReducedMotion.mockReturnValue(false);
    const { unmount } = render(
      <HourlyTimeline hours={hours} nowHour={12} sunrise={null} sunset={null} />,
    );

    expect(() => unmount()).not.toThrow();
  });
});
