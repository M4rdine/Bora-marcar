import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { City } from '@/application/ports';
import { saoPaulo } from '@/application/testing/fakes';

import { testMetrics } from '../../../testing/renderWithProviders';

import { CityResults } from './CityResults';

const rio: City = {
  id: '3451190',
  name: 'Rio de Janeiro',
  admin1: 'Rio de Janeiro',
  country: 'Brasil',
  countryCode: 'BR',
  latitude: -22.9068,
  longitude: -43.1729,
  timezone: 'America/Sao_Paulo',
};

describe('CityResults', () => {
  it('favoritas e recentes não vazias mostram as duas seções', () => {
    render(
      <SafeAreaProvider initialMetrics={testMetrics}>
        <CityResults
          results={[]}
          favorites={[saoPaulo]}
          recents={[rio]}
          isFavorite={(city) => city.id === saoPaulo.id}
          onSelect={() => undefined}
          onToggleFavorite={() => undefined}
        />
      </SafeAreaProvider>,
    );
    expect(screen.getByText('Favoritas')).toBeTruthy();
    expect(screen.getByText('Recentes')).toBeTruthy();
    expect(screen.getByLabelText('São Paulo, São Paulo, Brasil')).toBeTruthy();
    expect(screen.getByLabelText('Rio de Janeiro, Rio de Janeiro, Brasil')).toBeTruthy();
  });
});
