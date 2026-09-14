import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import type { AppServices } from '@/application/services';

import { useAppFocusRefetch } from './hooks/useAppFocusRefetch';
import { createQueryClient } from './queries/queryClient';
import { ServicesProvider } from './services/ServicesProvider';

export function AppProviders({
  services,
  children,
}: {
  services: AppServices;
  children: ReactNode;
}) {
  const [queryClient] = useState(createQueryClient);
  useAppFocusRefetch();
  return (
    <QueryClientProvider client={queryClient}>
      <ServicesProvider services={services}>{children}</ServicesProvider>
    </QueryClientProvider>
  );
}
