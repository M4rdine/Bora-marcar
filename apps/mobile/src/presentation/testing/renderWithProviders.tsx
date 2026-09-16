import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';

import type { AppServices } from '@/application/services';
import { fakeServices } from '@/application/testing/fakes';

import { ServicesProvider } from '../services/ServicesProvider';

// No app o provedor vem do expo-router; no teste precisamos de um explícito. As medidas são de um
// iPhone com indicador de home, o aparelho onde os recortes de área segura de fato aparecem.
export const testMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

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
      <SafeAreaProvider initialMetrics={testMetrics}>
        <QueryClientProvider client={client}>
          <ServicesProvider services={services}>{ui}</ServicesProvider>
        </QueryClientProvider>
      </SafeAreaProvider>,
    ),
  };
}
