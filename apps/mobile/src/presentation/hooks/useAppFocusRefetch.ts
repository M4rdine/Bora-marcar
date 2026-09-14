import { focusManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

const onChange = (status: AppStateStatus): void => {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
};

export function useAppFocusRefetch(): void {
  useEffect(() => {
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);
}
