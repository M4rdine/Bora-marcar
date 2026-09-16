import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { fakeGeocoding, fakeLocation, fakeServices, saoPaulo } from '@/application/testing/fakes';
import { err, ok } from '@/domain';

import { usePreferences } from '../../state/preferencesStore';
import { renderWithProviders } from '../../testing/renderWithProviders';

import { CitiesScreen } from './CitiesScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

// A FlatList (VirtualizedList) agenda a atualização de células visíveis via setTimeout interno.
// Sem esperar por ela dentro de act(), o React acusa "setState fora de act()" após o teste.
const flushListBatching = () => act(() => new Promise((resolve) => setTimeout(resolve, 100)));

beforeEach(() => {
  mockPush.mockClear();
  usePreferences.setState({ city: null, activity: 'walk', favorites: [], recents: [] });
});

describe('CitiesScreen', () => {
  it('busca depois de 2 letras, mostra resultado e seleciona a cidade', async () => {
    const geocoding = fakeGeocoding(ok([saoPaulo]));
    renderWithProviders(<CitiesScreen />, { services: fakeServices({ geocoding }) });
    expect(screen.getByText('Pelo menos 2 letras')).toBeTruthy();
    fireEvent.changeText(screen.getByLabelText('Digite o nome da cidade'), 'São');
    await screen.findByLabelText('São Paulo, São Paulo, Brasil', {}, { timeout: 2000 });
    expect(geocoding.calls).toEqual(['São']);
    expect(screen.queryByText('Pelo menos 2 letras')).toBeNull();
    await flushListBatching();
    fireEvent.press(screen.getByLabelText('São Paulo, São Paulo, Brasil'));
    expect(usePreferences.getState().city?.id).toBe(saoPaulo.id);
    expect(usePreferences.getState().recents.map((c) => c.id)).toEqual([saoPaulo.id]);
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('mostra a bandeira do país no resultado da busca', async () => {
    const geocoding = fakeGeocoding(ok([saoPaulo]));
    renderWithProviders(<CitiesScreen />, { services: fakeServices({ geocoding }) });
    fireEvent.changeText(screen.getByLabelText('Digite o nome da cidade'), 'São');
    await screen.findByLabelText('São Paulo, São Paulo, Brasil', {}, { timeout: 2000 });
    expect(screen.getByLabelText('Bandeira: Brasil')).toBeTruthy();
    await flushListBatching();
  });

  it('botão limpar esvazia a busca', () => {
    renderWithProviders(<CitiesScreen />, { services: fakeServices() });
    fireEvent.changeText(screen.getByLabelText('Digite o nome da cidade'), 'São');
    fireEvent.press(screen.getByLabelText('Limpar'));
    expect(screen.getByLabelText('Digite o nome da cidade').props.value).toBe('');
  });

  it('sem resultados mostra a mensagem', async () => {
    renderWithProviders(<CitiesScreen />, {
      services: fakeServices({ geocoding: fakeGeocoding(ok([])) }),
    });
    fireEvent.changeText(screen.getByLabelText('Digite o nome da cidade'), 'zzz');
    await screen.findByText('Nenhuma cidade encontrada para "zzz"', {}, { timeout: 2000 });
    await flushListBatching();
  });

  it('usa a localização quando permitida e mostra erro quando negada', async () => {
    const fix = { coords: { latitude: -23.5, longitude: -46.6 }, city: saoPaulo };
    const { unmount } = renderWithProviders(<CitiesScreen />, {
      services: fakeServices({ location: fakeLocation(ok(fix)) }),
    });
    fireEvent.press(screen.getByText('Usar minha localização'));
    await waitFor(() => expect(usePreferences.getState().city?.id).toBe(saoPaulo.id));
    await flushListBatching();
    unmount();
    renderWithProviders(<CitiesScreen />, {
      services: fakeServices({ location: fakeLocation(err({ code: 'denied' })) }),
    });
    fireEvent.press(screen.getByText('Usar minha localização'));
    await screen.findByText('Sem permissão de localização. Busque a cidade pelo nome.');
    await flushListBatching();
  });

  it('permissão negada oferece abrir os ajustes do sistema, a única saída no iOS', async () => {
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    renderWithProviders(<CitiesScreen />, {
      services: fakeServices({ location: fakeLocation(err({ code: 'denied' })) }),
    });
    fireEvent.press(screen.getByText('Usar minha localização'));
    fireEvent.press(await screen.findByText('Abrir ajustes do sistema'));
    expect(openSettings).toHaveBeenCalled();
    await flushListBatching();
    openSettings.mockRestore();
  });

  it('localização indisponível não oferece ajustes: não é questão de permissão', async () => {
    renderWithProviders(<CitiesScreen />, {
      services: fakeServices({ location: fakeLocation(err({ code: 'unavailable' })) }),
    });
    fireEvent.press(screen.getByText('Usar minha localização'));
    await screen.findByText('Não foi possível obter sua localização.');
    expect(screen.queryByText('Abrir ajustes do sistema')).toBeNull();
    await flushListBatching();
  });

  it('erro na busca mostra "Tentar de novo" e refaz a consulta', async () => {
    const geocoding = fakeGeocoding(err({ code: 'network' as const, message: 'offline' }));
    renderWithProviders(<CitiesScreen />, { services: fakeServices({ geocoding }) });
    fireEvent.changeText(screen.getByPlaceholderText('Digite o nome da cidade'), 'São Paulo');
    await screen.findByText('Tentar de novo', {}, { timeout: 2000 });
    fireEvent.press(screen.getByText('Tentar de novo'));
    await waitFor(() => expect(geocoding.calls.length).toBe(2));
  });

  it('enquanto busca mostra o skeleton', async () => {
    const slow = { search: () => new Promise<never>(() => undefined), calls: [] as string[] };
    renderWithProviders(<CitiesScreen />, { services: fakeServices({ geocoding: slow }) });
    fireEvent.changeText(screen.getByPlaceholderText('Digite o nome da cidade'), 'São Paulo');
    expect(
      (await screen.findAllByLabelText('Buscando…', {}, { timeout: 2000 })).length,
    ).toBeGreaterThan(0);
  });

  it('favorita e lista em Favoritas; recente some ao virar favorita', async () => {
    usePreferences.setState({ recents: [saoPaulo] });
    renderWithProviders(<CitiesScreen />, { services: fakeServices() });
    expect(screen.getByText('Recentes')).toBeTruthy();
    await flushListBatching();
    fireEvent.press(screen.getByLabelText('Favoritar'));
    await screen.findByText('Favoritas');
    expect(screen.queryByText('Recentes')).toBeNull();
    await flushListBatching();
  });
});
