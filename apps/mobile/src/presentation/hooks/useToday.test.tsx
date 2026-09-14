import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { fakeServices, fixedClock } from '@/application/testing/fakes';

import { ServicesProvider } from '../services/ServicesProvider';
import { usePreferences } from '../state/preferencesStore';

import { useToday } from './useToday';

const wrapper = (services: ReturnType<typeof fakeServices>) => {
  function Wrapper({ children }: { children: ReactNode }) {
    return <ServicesProvider services={services}>{children}</ServicesProvider>;
  }
  return Wrapper;
};

describe('useToday', () => {
  beforeEach(() => usePreferences.setState({ lastForecast: null }));

  it('usa o fuso da última previsão', () => {
    usePreferences.setState({
      lastForecast: { utcOffsetSeconds: 9 * 3600, timezone: 'Asia/Tokyo' },
    });
    // 2026-09-13T17:00Z → 14/09 02:00 em Tóquio
    const services = fakeServices({ clock: fixedClock(Date.UTC(2026, 8, 13, 17, 0, 0)) });
    const { result } = renderHook(() => useToday(), { wrapper: wrapper(services) });
    expect(result.current).toEqual({ date: '2026-09-14', utcOffsetSeconds: 32400 });
  });

  it('sem previsão usa o fuso do aparelho (TZ=UTC nos testes)', () => {
    const services = fakeServices({ clock: fixedClock(Date.UTC(2026, 8, 13, 17, 0, 0)) });
    const { result } = renderHook(() => useToday(), { wrapper: wrapper(services) });
    expect(result.current).toEqual({ date: '2026-09-13', utcOffsetSeconds: null });
  });
});
