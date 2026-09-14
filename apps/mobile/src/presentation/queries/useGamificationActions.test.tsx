import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { fakeServices } from '@/application/testing/fakes';

import { ServicesProvider } from '../services/ServicesProvider';

import { useGamificationActions } from './useGamificationActions';

describe('useGamificationActions', () => {
  it('propaga o erro de domínio quando a mutação falha', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
    });
    const services = fakeServices();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>
        <ServicesProvider services={services}>{children}</ServicesProvider>
      </QueryClientProvider>
    );
    const { result, unmount } = renderHook(() => useGamificationActions(), { wrapper });

    await expect(result.current.cancel.mutateAsync('plano-inexistente')).rejects.toEqual({
      code: 'planNotFound',
    });
    await waitFor(() => expect(result.current.cancel.isError).toBe(true));

    unmount();
    client.clear();
  });
});
