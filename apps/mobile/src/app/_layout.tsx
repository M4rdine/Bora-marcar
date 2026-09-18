import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { createServices } from '@/infrastructure/container';
import { EnvError, readEnv } from '@/infrastructure/env';
import { configureNotificationHandler } from '@/infrastructure/notifications/expoNotificationScheduler';
import { AppErrorBoundary, ErrorScreen } from '@/presentation/AppErrorBoundary';
import { AppProviders } from '@/presentation/AppProviders';
import { t } from '@/presentation/i18n/pt-BR';
import { useAppFonts } from '@/presentation/ui';

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
  const fontsLoaded = useAppFonts();
  if (services === null) {
    return <ErrorScreen message={t.errors.env} onRetry={() => setServices(initServices())} />;
  }
  // Segurar o primeiro quadro até a fonte chegar evita o salto de tipo do sistema para a do app,
  // que é justamente o tipo de costura que faz um app parecer montado.
  if (!fontsLoaded) return null;
  return (
    // A raiz de gestos é montada aqui de propósito. A pilha de navegação monta uma por dentro,
    // então o arrasto entre dias funcionaria de qualquer jeito — mas por acidente de implementação
    // da biblioteca, e só dentro dela. Declarar na raiz torna a dependência visível e vale para
    // qualquer gesto do app, inclusive fora da pilha.
    <GestureHandlerRootView style={styles.root}>
      <AppProviders services={services}>
        <AppErrorBoundary>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="day/[date]" options={{ presentation: 'card' }} />
          </Stack>
        </AppErrorBoundary>
      </AppProviders>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
