export type CacheSnapshot = {
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
};
export type Meter = { hit(): void; miss(): void; snapshot(): CacheSnapshot };

/** Contador de acerto de cache exposto em /health (spec 7.2). */
export function createMeter(): Meter {
  let hits = 0;
  let misses = 0;
  return {
    hit: () => {
      hits += 1;
    },
    miss: () => {
      misses += 1;
    },
    snapshot: () => {
      const total = hits + misses;
      return { hits, misses, hitRate: total === 0 ? 0 : Number((hits / total).toFixed(3)) };
    },
  };
}
