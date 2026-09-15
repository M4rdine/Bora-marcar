import { describe, expect, it } from 'vitest';

import { createMeter } from './meter';

describe('createMeter', () => {
  it('começa zerado', () => {
    expect(createMeter().snapshot()).toEqual({ hits: 0, misses: 0, hitRate: 0 });
  });

  it('conta hits e misses e calcula a taxa de acerto', () => {
    const meter = createMeter();
    meter.hit();
    meter.hit();
    meter.miss();
    expect(meter.snapshot()).toEqual({ hits: 2, misses: 1, hitRate: 0.667 });
  });
});
