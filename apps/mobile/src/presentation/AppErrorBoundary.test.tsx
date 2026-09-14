import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { AppErrorBoundary, ErrorScreen } from './AppErrorBoundary';
import { t } from './i18n/pt-BR';

function Bomb(): never {
  throw new Error('boom');
}

describe('ErrorScreen', () => {
  it('mostra os textos e aciona onRetry ao tocar no botão', () => {
    const onRetry = jest.fn();
    render(<ErrorScreen onRetry={onRetry} />);
    expect(screen.getByText(t.unexpected.title)).toBeTruthy();
    expect(screen.getByText(t.unexpected.body)).toBeTruthy();
    fireEvent.press(screen.getByRole('button'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('AppErrorBoundary', () => {
  it('renderiza os filhos quando não há erro', () => {
    render(
      <AppErrorBoundary>
        <Text>conteúdo normal</Text>
      </AppErrorBoundary>,
    );
    expect(screen.getByText('conteúdo normal')).toBeTruthy();
  });

  it('renderiza a ErrorScreen quando um filho lança', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      render(
        <AppErrorBoundary>
          <Bomb />
        </AppErrorBoundary>,
      );
      expect(screen.getByText(t.unexpected.title)).toBeTruthy();
      expect(screen.getByText(t.unexpected.body)).toBeTruthy();
    } finally {
      consoleError.mockRestore();
    }
  });
});
