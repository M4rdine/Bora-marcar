import AsyncStorage from '@react-native-async-storage/async-storage';

import { saoPaulo } from '@/application/testing/fakes';

import { usePreferences } from './preferencesStore';
import { resetAppData } from './resetAppData';

describe('resetAppData', () => {
  it('apaga o armazenamento e devolve as preferências ao primeiro acesso', async () => {
    await AsyncStorage.setItem('progress:v1', '{"events":[]}');
    usePreferences.setState({
      city: saoPaulo,
      activity: 'run',
      favorites: [saoPaulo],
      recents: [saoPaulo],
      lastForecast: { utcOffsetSeconds: -10800, timezone: 'America/Sao_Paulo' },
    });

    await resetAppData();

    expect(await AsyncStorage.getItem('progress:v1')).toBeNull();
    const state = usePreferences.getState();
    expect(state.city).toBeNull();
    expect(state.activity).toBe('walk');
    expect(state.favorites).toEqual([]);
    expect(state.recents).toEqual([]);
    expect(state.lastForecast).toBeNull();
  });

  it('não apaga as ações da store: o app continua utilizável depois do reset', async () => {
    await resetAppData();
    const state = usePreferences.getState();
    expect(typeof state.selectCity).toBe('function');
    expect(typeof state.selectActivity).toBe('function');
    state.selectCity(saoPaulo);
    expect(usePreferences.getState().city?.id).toBe(saoPaulo.id);
  });
});
