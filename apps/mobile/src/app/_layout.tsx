import { Stack } from 'expo-router';
import { useState } from 'react';

import { createServices } from '@/infrastructure/container';
import { readEnv } from '@/infrastructure/env';
import { configureNotificationHandler } from '@/infrastructure/notifications/expoNotificationScheduler';
import { AppProviders } from '@/presentation/AppProviders';

configureNotificationHandler();

export default function RootLayout() {
  const [services] = useState(() => createServices(readEnv()));
  return (
    <AppProviders services={services}>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
