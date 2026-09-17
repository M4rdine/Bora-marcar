import { pathBounds } from './pathBounds';

describe('pathBounds', () => {
  it('mede uma linha absoluta simples', () => {
    expect(pathBounds('M2 4 L10 20')).toEqual({ minX: 2, minY: 4, maxX: 10, maxY: 20 });
  });

  it('acompanha coordenadas relativas', () => {
    // começa em (2,2), anda +3 em x e +4 em y
    expect(pathBounds('M2 2 l3 4')).toEqual({ minX: 2, minY: 2, maxX: 5, maxY: 6 });
  });

  it('entende os atalhos horizontal e vertical', () => {
    expect(pathBounds('M5 5 H15 V20')).toEqual({ minX: 5, minY: 5, maxX: 15, maxY: 20 });
    expect(pathBounds('M5 5 h10 v15')).toEqual({ minX: 5, minY: 5, maxX: 15, maxY: 20 });
  });

  it('inclui os pontos de controle da curva, que contêm a curva', () => {
    // a curva nunca sai do fecho convexo dos controles, então medi-los nunca subestima
    expect(pathBounds('M0 0 C0 30 20 30 20 0')).toEqual({
      minX: 0,
      minY: 0,
      maxX: 20,
      maxY: 30,
    });
  });

  it('um comando repetido sem a letra continua valendo', () => {
    expect(pathBounds('M0 0 L5 5 10 2')).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 5 });
  });

  it('um segundo par depois de M vira L, e não outro M', () => {
    // se tratasse como M, o ponto corrente saltaria e o relativo seguinte erraria
    expect(pathBounds('M0 0 4 4 l2 2')).toEqual({ minX: 0, minY: 0, maxX: 6, maxY: 6 });
  });

  it('fecha o caminho de volta ao início', () => {
    expect(pathBounds('M4 4 L10 4 L10 10 Z')).toEqual({ minX: 4, minY: 4, maxX: 10, maxY: 10 });
  });

  it('o arco sai da corda, mas só para o lado em que ele de fato curva', () => {
    // Semicírculo de raio 4 entre (10,10) e (10,18), varrendo para a esquerda: chega a x=6 e
    // nunca passa de x=10. Limitar pela elipse inteira diria 14, que é uma folga inexistente.
    const b = pathBounds('M10 10 a4 4 0 0 0 0 8');
    expect(b.minX).toBeCloseTo(6, 1);
    expect(b.maxX).toBeCloseTo(10, 1);
  });

  it('e curva para o outro lado quando o sentido inverte', () => {
    const b = pathBounds('M10 10 a4 4 0 0 1 0 8');
    expect(b.minX).toBeCloseTo(10, 1);
    expect(b.maxX).toBeCloseTo(14, 1);
  });

  it('uma volta grande alcança longe, uma pequena não', () => {
    const grande = pathBounds('M15.8 3.2a9 9 0 1 0 5 5');
    const pequena = pathBounds('M20.8 8.2a7 7 0 0 1-5-5');
    expect(grande.maxX - grande.minX).toBeGreaterThan(15);
    expect(pequena.maxX - pequena.minX).toBeLessThan(8);
  });

  it('pega o vazamento que passou despercebido: o raio da trovoada', () => {
    // o desenho original terminava em y=25,5 num viewBox de 24 e era cortado na tela
    expect(pathBounds('M13 19.5 10 23h3l-1.2 2.5').maxY).toBeCloseTo(25.5, 5);
  });
});
