const REGIONAL_INDICATOR_BASE = 0x1f1e6; // 🇦
const ASCII_A = 'A'.charCodeAt(0);

const isAsciiLetter = (ch: string | undefined): ch is string =>
  ch !== undefined && /^[a-zA-Z]$/.test(ch);

/** ISO-3166-1 alpha-2 → bandeira via indicadores regionais; entrada inválida/vazia → 🏳️. */
export function countryFlag(iso2: string): string {
  const chars = [...iso2];
  if (chars.length !== 2 || !isAsciiLetter(chars[0]) || !isAsciiLetter(chars[1])) return '🏳️';
  const codePoints = chars.map(
    (ch) => REGIONAL_INDICATOR_BASE + ch.toUpperCase().charCodeAt(0) - ASCII_A,
  );
  return String.fromCodePoint(...codePoints);
}
