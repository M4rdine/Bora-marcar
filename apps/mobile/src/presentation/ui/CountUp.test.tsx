import { act, render } from '@testing-library/react-native';

import { CountUp } from './CountUp';
import { useReducedMotion } from './useReducedMotion';

jest.mock('./useReducedMotion', () => ({ useReducedMotion: jest.fn() }));

const mockedUseReducedMotion = useReducedMotion as jest.Mock;
const format = (n: number) => `+${n} XP`;

describe('CountUp', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // jsdom/jest-expo não avançam requestAnimationFrame com o relógio falso; a substituição por
    // setTimeout deixa o loop de contagem controlável por jest.advanceTimersByTime.
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
      setTimeout(() => cb(Date.now()), 16) as unknown as number) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = ((id: number) =>
      clearTimeout(id)) as typeof cancelAnimationFrame;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('anima de +0 XP até o valor final em motion.count ms', () => {
    mockedUseReducedMotion.mockReturnValue(false);
    const { getByText } = render(<CountUp value={153} format={format} duration={900} />);

    expect(getByText('+0 XP')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(900 + 50);
    });

    expect(getByText('+153 XP')).toBeTruthy();
  });

  it('com movimento reduzido mostra o valor final já no primeiro render, sem efeito', () => {
    mockedUseReducedMotion.mockReturnValue(true);
    const { getByText, queryByText } = render(
      <CountUp value={153} format={format} duration={900} />,
    );

    expect(getByText('+153 XP')).toBeTruthy();
    expect(queryByText('+0 XP')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(900 + 50);
    });

    expect(getByText('+153 XP')).toBeTruthy();
  });
});
