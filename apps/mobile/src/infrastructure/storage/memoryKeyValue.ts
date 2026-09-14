import type { KeyValueStorage } from '@/application/ports';

export function memoryKeyValue(initial: Readonly<Record<string, string>> = {}): KeyValueStorage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
}
