import { Pressable, StyleSheet } from 'react-native';

import { AppText } from './Text';
import { tokens } from './tokens';

type Kind = 'primary' | 'mint' | 'quiet';

type Props = {
  readonly label: string;
  readonly subtext?: string;
  readonly kind?: Kind;
  readonly onPress: () => void;
  readonly disabled?: boolean;
  readonly accessibilityLabel?: string;
};

const BACKGROUND_BY_KIND: Record<Kind, string> = {
  primary: tokens.color.accent,
  mint: tokens.color.mint,
  quiet: tokens.color.surface,
};

const TEXT_COLOR_BY_KIND: Record<Kind, string> = {
  primary: tokens.color.accentInk,
  mint: tokens.color.mintInk,
  quiet: tokens.color.text,
};

export function Button({
  label,
  subtext,
  kind = 'primary',
  onPress,
  disabled = false,
  accessibilityLabel,
}: Props) {
  const textColor = TEXT_COLOR_BY_KIND[kind];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: BACKGROUND_BY_KIND[kind] },
        kind === 'primary' && styles.shadow,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <AppText variant="subtitle" weight="800" style={{ color: textColor }}>
        {label}
      </AppText>
      {subtext !== undefined ? (
        <AppText variant="small" style={[styles.subtext, { color: textColor, opacity: 0.75 }]}>
          {subtext}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: tokens.radius.inner,
    paddingVertical: tokens.space[4],
    paddingHorizontal: tokens.space[5],
    alignItems: 'center',
  },
  shadow: {
    shadowColor: tokens.color.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
  subtext: { marginTop: tokens.space[1] },
});
