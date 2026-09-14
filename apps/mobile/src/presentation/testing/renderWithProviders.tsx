import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import type { AppServices } from '@/application/services';
import { fakeServices } from '@/application/testing/fakes';

import { ServicesProvider } from '../services/ServicesProvider';

export function renderWithProviders(ui: ReactElement, opts: { services?: AppServices } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const services = opts.services ?? fakeServices();
  return {
    services,
    ...render(
      <QueryClientProvider client={client}>
        <ServicesProvider services={services}>{ui}</ServicesProvider>
      </QueryClientProvider>,
    ),
  };
}
