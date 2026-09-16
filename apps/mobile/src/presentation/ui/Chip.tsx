import { Pressable, StyleSheet, View } from 'react-native';

import type { ScoreLabel } from '@/domain';

import { t } from '../i18n/pt-BR';

import { AppText } from './Text';
import { tokens } from './tokens';

type Props = {
  readonly label: string;
  readonly emoji?: string;
  readonly active?: boolean;
  readonly score?: number | null;
  /** Rótulo do score: define a cor da mini-pílula e entra no rótulo de acessibilidade. */
  readonly scoreLabel?: ScoreLabel | undefined;
  readonly onPress: () => void;
};

/** Sem rótulo de score o chip cai no tom "good" (menta), a cor histórica da mini-pílula. */
const DEFAULT_SCORE_LABEL: ScoreLabel = 'good';

export function Chip({ label, emoji, active = false, score = null, scoreLabel, onPress }: Props) {
  const shownScore = active ? score : null;
  const tone = scoreLabel ?? DEFAULT_SCORE_LABEL;
  const ariaLabel =
    shownScore !== null && scoreLabel !== undefined ? t.home.chipScore(label, shownScore) : label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        active ? styles.active : styles.inactive,
        pressed ? styles.pressed : null,
      ]}
    >
      {emoji !== undefined ? <AppText>{emoji}</AppText> : null}
      <AppText variant="small" weight="600" style={active ? styles.activeText : undefined}>
        {label}
      </AppText>
      {shownScore !== null ? (
        <View style={[styles.scorePill, { backgroundColor: tokens.color.score[tone] }]}>
          <AppText variant="micro" weight="800" style={{ color: tokens.color.scoreInk[tone] }}>
            {shownScore}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: tokens.size.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[1],
    paddingVertical: tokens.space[2],
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.pill,
  },
  inactive: { backgroundColor: tokens.color.surface },
  pressed: { opacity: 0.6 },
  active: { backgroundColor: tokens.color.accent },
  activeText: { color: tokens.color.accentInk },
  scorePill: {
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.space[1],
    paddingHorizontal: tokens.space[1],
  },
});
