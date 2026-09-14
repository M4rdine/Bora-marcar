import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KeyValueStorage } from '@/application/ports';

export const asyncStorageKeyValue = (): KeyValueStorage => ({
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key),
});
