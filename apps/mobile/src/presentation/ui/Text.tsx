import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { tokens } from './tokens';
import { fontFamily, type FontRole, type FontWeight } from './typography';

type Variant = 'display' | 'xp' | 'title' | 'subtitle' | 'body' | 'small' | 'micro' | 'kicker';
type Tone = 'default' | 'muted' | 'ink' | 'mint';
type Props = TextProps & {
  readonly variant?: Variant;
  readonly tone?: Tone;
  readonly tabular?: boolean;
  readonly weight?: FontWeight;
};

/** Papel e peso padrão de cada variante. O papel é o que decide qual das duas famílias fala. */
const VARIANT_FONT: Record<Variant, { readonly role: FontRole; readonly weight: FontWeight }> = {
  display: { role: 'display', weight: '800' },
  xp: { role: 'display', weight: '800' },
  title: { role: 'display', weight: '700' },
  subtitle: { role: 'text', weight: '700' },
  body: { role: 'text', weight: '400' },
  small: { role: 'text', weight: '400' },
  micro: { role: 'text', weight: '500' },
  kicker: { role: 'text', weight: '700' },
};

export function AppText({
  variant = 'body',
  tone = 'default',
  tabular = false,
  weight,
  style,
  ...rest
}: Props) {
  const { role, weight: defaultWeight } = VARIANT_FONT[variant];
  return (
    <Text
      {...rest}
      style={[
        styles.base,
        styles[variant],
        styles[`tone_${tone}`],
        tabular && styles.tabular,
        { fontFamily: fontFamily(role, weight ?? defaultWeight) },
        style,
      ]}
    />
  );
}

type StyleKey = 'base' | Variant | `tone_${Tone}` | 'tabular';

/**
 * A entrelinha dos dois maiores tamanhos é maior que o corpo de propósito. Quando era igual, os
 * acentos de "Amanhã" e "Concluído" encostavam no topo da caixa e ficavam cortados.
 */
const DISPLAY_LEADING = 1.08;

const styles = StyleSheet.create<Record<StyleKey, TextStyle>>({
  base: { color: tokens.color.text },
  display: {
    fontSize: tokens.font.display,
    letterSpacing: -1.5,
    lineHeight: Math.round(tokens.font.display * DISPLAY_LEADING),
  },
  xp: {
    fontSize: tokens.font.xp,
    letterSpacing: -2,
    lineHeight: Math.round(tokens.font.xp * DISPLAY_LEADING),
  },
  title: { fontSize: tokens.font.title, lineHeight: 26, letterSpacing: -0.3 },
  subtitle: { fontSize: tokens.font.subtitle, lineHeight: 22 },
  body: { fontSize: tokens.font.body, lineHeight: 20 },
  small: { fontSize: tokens.font.small, lineHeight: 17 },
  micro: { fontSize: tokens.font.micro, lineHeight: 14 },
  kicker: {
    fontSize: tokens.font.micro,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  tone_default: {},
  tone_muted: { color: tokens.color.textMuted },
  tone_ink: { color: tokens.color.ink },
  tone_mint: { color: tokens.color.mint },
  tabular: { fontVariant: ['tabular-nums'] },
});
