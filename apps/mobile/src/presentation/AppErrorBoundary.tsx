import { Component, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from './i18n/pt-BR';
import { AppText, Button, Sky, Surface, tokens } from './ui';

export function ErrorScreen({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <Sky phase="rainy">
      <SafeAreaView style={styles.safe}>
        <Surface strength="strong" radius="hero" padding={5} gap={3}>
          <AppText variant="title">{t.unexpected.title}</AppText>
          <AppText variant="body">{message ?? t.unexpected.body}</AppText>
          <Button label={t.home.retry} kind="quiet" onPress={onRetry} />
        </Surface>
      </SafeAreaView>
    </Sky>
  );
}

type State = { readonly hasError: boolean };

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return <ErrorScreen onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: tokens.space[4], justifyContent: 'center' },
});
