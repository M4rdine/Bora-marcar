import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import type { AppServices } from '@/application/services';
import { fakeServices } from '@/application/testing/fakes';

import { ServicesProvider } from '../services/ServicesProvider';

// Alguns hooks (ex.: useForecast) sobrescrevem gcTime com um valor alto, e o React Query usa um
// gcTime padrão de 5 min para mutations (não zerado por client.clear()). Sem `gcTime: 0` nos dois
// e sem limpar o client no fim de cada teste, os timers de coleta de lixo mantêm o Jest vivo.
const activeClients: QueryClient[] = [];
afterEach(() => {
  activeClients.splice(0).forEach((client) => client.clear());
});

export function renderWithProviders(ui: ReactElement, opts: { services?: AppServices } = {}) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { gcTime: 0 },
    },
  });
  activeClients.push(client);
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
