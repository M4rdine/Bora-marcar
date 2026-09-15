import { render, screen } from '@testing-library/react-native';

import { LevelOrb } from './LevelOrb';

describe('LevelOrb', () => {
  // O arco em si é visual (duas máscaras com meio anel girado); o que o teste fixa é o número no
  // centro e a porcentagem lida pelo leitor de tela em cada ponto da volta, inclusive nos
  // extremos (0 %, 50 % e 100 %) que trocam qual metade do anel recebe o giro.
  it.each([
    [0, 0],
    [0.25, 25],
    [0.5, 50],
    [0.75, 75],
    [1, 100],
  ])('progresso %s é lido como %s%%', (progress, pct) => {
    render(<LevelOrb level={4} name="Ventania" progress={progress} />);
    expect(screen.getByLabelText(`Nível 4, Ventania, ${pct}% para o próximo`)).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('limita progresso fora de 0–1 aos extremos', () => {
    const { rerender } = render(<LevelOrb level={1} name="Garoa" progress={-0.5} />);
    expect(screen.getByLabelText('Nível 1, Garoa, 0% para o próximo')).toBeTruthy();
    rerender(<LevelOrb level={1} name="Garoa" progress={2} />);
    expect(screen.getByLabelText('Nível 1, Garoa, 100% para o próximo')).toBeTruthy();
  });
});
