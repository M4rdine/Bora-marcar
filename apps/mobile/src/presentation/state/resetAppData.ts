import AsyncStorage from '@react-native-async-storage/async-storage';

import { usePreferences } from './preferencesStore';

/** Estado de primeiro acesso: sem cidade, na atividade padrão e sem nada lembrado. */
const FIRST_RUN = {
  city: null,
  activity: 'walk',
  favorites: [],
  recents: [],
  lastForecast: null,
} as const;

/**
 * Apaga tudo que o app guardou no aparelho e devolve a memória ao estado de primeira abertura.
 *
 * Usa `clear()` em vez de remover as três chaves conhecidas de propósito: o objetivo é "como se
 * eu nunca tivesse aberto", e uma chave nova que alguém adicione amanhã continuaria sobrevivendo
 * a uma lista fixa. Só existe em desenvolvimento, onde o armazenamento é do app e de mais ninguém.
 */
export async function resetAppData(): Promise<void> {
  await AsyncStorage.clear();
  usePreferences.setState(FIRST_RUN);
}
