import { countryFlag } from './countryFlag';

describe('countryFlag', () => {
  it('converte um ISO-3166-1 alpha-2 maiúsculo em bandeira', () => {
    expect(countryFlag('BR')).toBe('🇧🇷');
  });

  it('aceita minúsculas', () => {
    expect(countryFlag('br')).toBe('🇧🇷');
  });

  it('converte outro país', () => {
    expect(countryFlag('PT')).toBe('🇵🇹');
  });

  it('string vazia cai no fallback', () => {
    expect(countryFlag('')).toBe('🏳️');
  });

  it('um único caractere cai no fallback', () => {
    expect(countryFlag('B')).toBe('🏳️');
  });

  it('dígitos caem no fallback', () => {
    expect(countryFlag('123')).toBe('🏳️');
  });
});
