import { render, screen } from '@testing-library/react-native';

import { Icon } from './Icon';
import { ICON_SHAPES, type IconName } from './paths';

const NAMES = Object.keys(ICON_SHAPES) as IconName[];
const GRID = 24;

describe('conjunto de ícones', () => {
  it('todo ícone tem desenho: nenhum nome cai num quadrado vazio', () => {
    for (const name of NAMES) {
      expect(ICON_SHAPES[name].length).toBeGreaterThan(0);
    }
  });

  it('todo desenho cabe na grade de 24, senão o conjunto não parece um conjunto', () => {
    const TOLERANCE = 2;
    for (const name of NAMES) {
      for (const shape of ICON_SHAPES[name]) {
        if (shape.kind === 'line') {
          for (const v of [shape.x1, shape.y1, shape.x2, shape.y2]) {
            expect(v).toBeGreaterThanOrEqual(-TOLERANCE);
            expect(v).toBeLessThanOrEqual(GRID + TOLERANCE);
          }
        }
        if (shape.kind === 'circle') {
          expect(shape.r).toBeGreaterThan(0);
          expect(shape.cx + shape.r).toBeLessThanOrEqual(GRID + TOLERANCE);
          expect(shape.cy + shape.r).toBeLessThanOrEqual(GRID + TOLERANCE);
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
