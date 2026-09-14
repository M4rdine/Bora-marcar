import {
  piecewise,
  rainComfort,
  sunComfort,
  thermalComfort,
  uvComfort,
  windComfort,
} from './comfort';

describe('piecewise', () => {
  const pts: [number, number][] = [
    [0, 1],
    [10, 0],
  ];
  it('interpola linearmente e satura nas pontas', () => {
    expect(piecewise(pts, -5)).toBe(1);
    expect(piecewise(pts, 0)).toBe(1);
    expect(piecewise(pts, 5)).toBeCloseTo(0.5);
    expect(piecewise(pts, 10)).toBe(0);
    expect(piecewise(pts, 50)).toBe(0);
  });

  it('lista vazia devolve 0', () => {
    expect(piecewise([], 5)).toBe(0);
  });
});

describe('thermalComfort (caminhada: ideal 17–26, tolerância 8–33)', () => {
  const range = { idealMin: 17, idealMax: 26, tolMin: 8, tolMax: 33 };
  it.each([
    [20, 1],
    [17, 1],
    [26, 1],
    [12.5, 0.5],
    [29.5, 0.5],
    [8, 0],
    [33, 0],
    [-5, 0],
    [40, 0],
  ])('%i° → %f', (t, expected) => {
    expect(thermalComfort(t, range)).toBeCloseTo(expected);
  });
});

describe('rainComfort', () => {
  it.each([
    [0, 0, 1],
    [20, 0, 1],
    [35, 0, 0.75],
    [50, 0, 0.5],
    [65, 0, 0.3],
    [80, 0, 0],
    [95, 0, 0],
  ])('prob %i%% mm %f → %f', (p, mm, expected) => {
    expect(rainComfort(p, mm)).toBeCloseTo(expected);
  });
  it('volume entre 0,2 e 1 mm multiplica por 0,6', () => {
    expect(rainComfort(10, 0.5)).toBeCloseTo(0.6);
    expect(rainComfort(10, 0.1)).toBeCloseTo(1);
    expect(rainComfort(10, 1)).toBeCloseTo(0.6);
    expect(rainComfort(10, 1.5)).toBeCloseTo(0.6);
  });
});

describe('windComfort (ok 20, máx 45)', () => {
  const limit = { ok: 20, max: 45 };
  it.each([
    [0, 0, 1],
    [20, 25, 1],
    [32.5, 30, 0.5],
    [45, 40, 0],
    [60, 50, 0],
  ])('%f km/h → %f', (speed, gusts, expected) => {
    expect(windComfort(speed, gusts, limit)).toBeCloseTo(expected);
  });
  it('rajadas acima de 1,3 × máx multiplicam por 0,7', () => {
    expect(windComfort(10, 60, limit)).toBeCloseTo(0.7);
    expect(windComfort(10, 58.5, limit)).toBeCloseTo(1);
  });
});

describe('uvComfort (ok 5, máx 9)', () => {
  const limit = { ok: 5, max: 9 };
  it.each([
    [0, 1],
    [5, 1],
    [7, 0.65],
    [9, 0.3],
    [11, 0.2],
  ])('UV %i → %f', (uv, expected) => {
    expect(uvComfort(uv, limit)).toBeCloseTo(expected);
  });
});

describe('sunComfort', () => {
  it.each([
    [0, 1],
    [30, 1],
    [65, 0.65],
    [100, 0.3],
  ])('nuvens %i%% → %f', (cloud, expected) => {
    expect(sunComfort(cloud)).toBeCloseTo(expected);
  });
});
