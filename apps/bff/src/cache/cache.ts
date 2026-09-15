export type Cache = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  /** Registra um evento na janela deslizante da chave e devolve quantos há nos últimos `windowMs`. */
  slidingCount(key: string, nowMs: number, windowMs: number): Promise<number>;
  ping(): Promise<boolean>;
  close?(): Promise<void>;
};
