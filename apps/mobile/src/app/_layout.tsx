import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { useState } from 'react';

import { createServices } from '@/infrastructure/container';
import { readEnv } from '@/infrastructure/env';
import { configureNotificationHandler } from '@/infrastructure/notifications/expoNotificationScheduler';
import { AppErrorBoundary, ErrorScreen } from '@/presentation/AppErrorBoundary';
import { AppProviders } from '@/presentation/AppProviders';

configureNotificationHandler();

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <ErrorScreen onRetry={() => void retry()} />;
}

export default function RootLayout() {
  const [services] = useState(() => createServices(readEnv()));
  return (
    <AppProviders services={services}>
      <AppErrorBoundary>
        <Stack screenOptions={{ headerShown: false }} />
      </AppErrorBoundary>
    </AppProviders>
  );
}
