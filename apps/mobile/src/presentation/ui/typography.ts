/**
 * Duas famílias, dois papéis.
 *
 * `display` é Archivo: um grotesco de números largos e confiantes, para as horas, o XP e os
 * títulos. É a voz do app, e o território de instrumento esportivo que as referências pedem.
 * `text` é Manrope: geométrica e neutra, feita para ler bem em 10 e 12 pixels, que é onde a
 * maior parte do conteúdo vive.
 *
 * No React Native `fontWeight` não funciona com fonte carregada: cada peso é uma família com
 * nome próprio. Por isso o peso vira uma busca nestes mapas, e não um número no estilo.
 */
export type FontWeight = '400' | '500' | '600' | '700' | '800' | '900';
export type FontRole = 'display' | 'text';

const DISPLAY: Record<FontWeight, string> = {
  '400': 'Archivo_500Medium',
  '500': 'Archivo_500Medium',
  '600': 'Archivo_600SemiBold',
  '700': 'Archivo_700Bold',
  '800': 'Archivo_800ExtraBold',
  // Archivo tem 900, mas o salto de 800 para 900 nos tamanhos grandes fecha demais os contornos.
  '900': 'Archivo_800ExtraBold',
};

const TEXT: Record<FontWeight, string> = {
  '400': 'Manrope_400Regular',
  '500': 'Manrope_500Medium',
  '600': 'Manrope_600SemiBold',
  '700': 'Manrope_700Bold',
  '800': 'Manrope_800ExtraBold',
  // Manrope não tem 900; cair para 800 é melhor que voltar para a fonte do sistema.
  '900': 'Manrope_800ExtraBold',
};

const FAMILIES: Record<FontRole, Record<FontWeight, string>> = { display: DISPLAY, text: TEXT };

export function fontFamily(role: FontRole, weight: FontWeight): string {
  return FAMILIES[role][weight];
}

/** Toda família que o app pode pedir. Serve de contrato para o carregamento e para o teste. */
export const ALL_FONT_FAMILIES: readonly string[] = [
  ...new Set([...Object.values(DISPLAY), ...Object.values(TEXT)]),
];
