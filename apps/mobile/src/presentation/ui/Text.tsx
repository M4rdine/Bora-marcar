import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { tokens } from './tokens';

type Variant = 'display' | 'xp' | 'title' | 'subtitle' | 'body' | 'small' | 'micro' | 'kicker';
type Tone = 'default' | 'muted' | 'ink' | 'mint';
type Props = TextProps & {
  readonly variant?: Variant;
  readonly tone?: Tone;
  readonly tabular?: boolean;
  readonly weight?: '400' | '600' | '700' | '800' | '900';
};

export function AppText({
  variant = 'body',
  tone = 'default',
  tabular = false,
  weight,
  style,
  ...rest
}: Props) {
  return (
    <Text
      {...rest}
      style={[
        styles.base,
        styles[variant],
        styles[`tone_${tone}`],
        tabular && styles.tabular,
        weight && { fontWeight: weight },
        style,
      ]}
    />
  );
}

type StyleKey = 'base' | Variant | `tone_${Tone}` | 'tabular';

const styles = StyleSheet.create<Record<StyleKey, TextStyle>>({
  base: { color: tokens.color.text },
  display: {
    fontSize: tokens.font.display,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: tokens.font.display,
  },
  xp: {
    fontSize: tokens.font.xp,
    fontWeight: '900',
    letterSpacing: -2.5,
    lineHeight: tokens.font.xp,
  },
  title: { fontSize: tokens.font.title, fontWeight: '700' },
  subtitle: { fontSize: tokens.font.subtitle, fontWeight: '700' },
  body: { fontSize: tokens.font.body, lineHeight: 20 },
  small: { fontSize: tokens.font.small, lineHeight: 16 },
  micro: { fontSize: tokens.font.micro, lineHeight: 14 },
  kicker: {
    fontSize: tokens.font.small,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  tone_default: {},
  tone_muted: { color: tokens.color.textMuted },
  tone_ink: { color: tokens.color.ink },
  tone_mint: { color: tokens.color.mint },
  tabular: { fontVariant: ['tabular-nums'] },
});
