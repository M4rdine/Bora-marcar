import { routeDate } from './routeDate';

describe('routeDate', () => {
  it('usa a string quando o parâmetro vem uma vez só', () => {
    expect(routeDate('2026-09-16')).toBe('2026-09-16');
  });

  it('usa a primeira ocorrência quando o parâmetro se repete', () => {
    expect(routeDate(['2026-09-16', '2026-09-17'])).toBe('2026-09-16');
  });

  it('vira string vazia quando o parâmetro falta (a tela mostra "Dia fora da previsão")', () => {
    expect(routeDate(undefined)).toBe('');
    expect(routeDate([])).toBe('');
  });
});
