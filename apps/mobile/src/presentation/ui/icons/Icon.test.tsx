import { render, screen } from '@testing-library/react-native';

import { Icon } from './Icon';
import { pathBounds } from './pathBounds';
import { ICON_SHAPES, type IconName } from './paths';

const NAMES = Object.keys(ICON_SHAPES) as IconName[];
const GRID = 24;

describe('conjunto de ícones', () => {
  it('todo ícone tem desenho: nenhum nome cai num quadrado vazio', () => {
    for (const name of NAMES) {
      expect(ICON_SHAPES[name].length).toBeGreaterThan(0);
    }
  });

  /**
   * A regra real não é "caber em 24": um traço de 2 é centrado no caminho, então avança 1 para
   * fora dele. Um desenho contornado precisa ficar entre 1 e 23 para não ser recortado; um
   * preenchido pode ir até a borda. A tolerância antiga de 2 deixava passar exatamente o
   * vazamento que cortou o raio da trovoada.
   */
  it('todo desenho cabe na grade, contando a espessura do traço', () => {
    const HALF_STROKE = 1;
    const limit = (filled: boolean) => ({
      min: filled ? 0 : HALF_STROKE,
      max: filled ? GRID : GRID - HALF_STROKE,
    });
    const TOLERANCE = 0.01;
    for (const name of NAMES) {
      for (const shape of ICON_SHAPES[name]) {
        if (shape.kind === 'line') {
          const { min, max } = limit(false);
          for (const v of [shape.x1, shape.y1, shape.x2, shape.y2]) {
            expect({
              icone: name,
              forma: 'linha',
              dentro: v >= min - TOLERANCE && v <= max + TOLERANCE,
            }).toEqual({ icone: name, forma: 'linha', dentro: true });
          }
        }
        if (shape.kind === 'circle') {
          const { min, max } = limit(shape.fill === true);
          expect(shape.r).toBeGreaterThan(0);
          const extremes = [
            shape.cx - shape.r,
            shape.cy - shape.r,
            shape.cx + shape.r,
            shape.cy + shape.r,
          ];
          for (const v of extremes) {
            expect({
              icone: name,
              forma: 'circulo',
              dentro: v >= min - TOLERANCE && v <= max + TOLERANCE,
            }).toEqual({ icone: name, forma: 'circulo', dentro: true });
          }
        }
        // Caminho não era verificado, e foi exatamente um caminho que saiu da grade: o raio da
        // trovoada terminava em y=25,5 e era cortado, deixando a trovoada igual a nublado.
        if (shape.kind === 'path') {
          const b = pathBounds(shape.d);
          const { min, max } = limit(shape.fill === true);
          const sides = [
            ['baixo', b.maxY <= max + TOLERANCE],
            ['direita', b.maxX <= max + TOLERANCE],
            ['topo', b.minY >= min - TOLERANCE],
            ['esquerda', b.minX >= min - TOLERANCE],
          ] as const;
          for (const [lado, dentro] of sides) {
            expect({ icone: name, lado, dentro }).toEqual({ icone: name, lado, dentro: true });
          }
        }
      }
    }
  });

  it('com rótulo, o ícone é anunciado pelo leitor de tela', () => {
    render(<Icon name="clear" label="céu limpo" />);
    expect(screen.getByLabelText('céu limpo')).toBeTruthy();
  });

  it('sem rótulo, o ícone é decorativo e some da leitura', () => {
    render(<Icon name="clear" />);
    expect(screen.queryByLabelText('céu limpo')).toBeNull();
  });

  it('renderiza todos os nomes sem quebrar', () => {
    for (const name of NAMES) {
      const { unmount } = render(<Icon name={name} />);
      unmount();
    }
  });
});
