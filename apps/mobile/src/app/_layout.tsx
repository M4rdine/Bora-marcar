import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { useState } from 'react';

import { createServices } from '@/infrastructure/container';
import { EnvError, readEnv } from '@/infrastructure/env';
import { configureNotificationHandler } from '@/infrastructure/notifications/expoNotificationScheduler';
import { AppErrorBoundary, ErrorScreen } from '@/presentation/AppErrorBoundary';
import { AppProviders } from '@/presentation/AppProviders';
import { t } from '@/presentation/i18n/pt-BR';

configureNotificationHandler();

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <ErrorScreen onRetry={() => void retry()} />;
}

const initServices = (): ReturnType<typeof createServices> | null => {
  try {
    return createServices(readEnv());
  } catch (e) {
    if (e instanceof EnvError) return null;
    throw e;
  }
};

export default function RootLayout() {
  const [services, setServices] = useState(initServices);
  if (services === null) {
    return <ErrorScreen message={t.errors.env} onRetry={() => setServices(initServices())} />;
  }
  return (
    <AppProviders services={services}>
      <AppErrorBoundary>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="day/[date]" options={{ presentation: 'card' }} />
        </Stack>
      </AppErrorBoundary>
    </AppProviders>
  );
}
