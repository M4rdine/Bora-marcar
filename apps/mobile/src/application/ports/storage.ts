import type { EngineConfig, GamificationEvent } from '@/domain';

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type ProgressRepository = {
  load(): Promise<readonly GamificationEvent[]>;
  append(event: GamificationEvent): Promise<void>;
};

export type EngineConfigProvider = { get(): Promise<EngineConfig> };
