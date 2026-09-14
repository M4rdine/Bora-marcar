import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './Text';
import { tokens } from './tokens';

type Props = {
  readonly label: string;
  readonly emoji?: string;
  readonly active?: boolean;
  readonly score?: number | null;
  readonly onPress: () => void;
};

export function Chip({ label, emoji, active = false, score = null, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.base, active ? styles.active : styles.inactive]}
    >
      {emoji !== undefined ? <AppText>{emoji}</AppText> : null}
      <AppText variant="small" weight="600" style={active ? styles.activeText : undefined}>
        {label}
      </AppText>
      {active && score !== null ? (
        <View style={styles.scorePill}>
          <AppText variant="micro" weight="800" style={styles.scoreText}>
            {score}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[1],
    paddingVertical: tokens.space[2],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.pill,
  },
  inactive: { backgroundColor: tokens.color.surface },
  active: { backgroundColor: tokens.color.accent },
  activeText: { color: tokens.color.accentInk },
  scorePill: {
    backgroundColor: tokens.color.mint,
    borderRadius: tokens.radius.pill,
    paddingVertical: 2,
    paddingHorizontal: tokens.space[1],
  },
  scoreText: { color: tokens.color.mintInk },
});
