import { StyleSheet, View } from 'react-native';

import { AppText } from './Text';
import { tokens, type ScoreTone } from './tokens';

type Tone = ScoreTone | 'neutral';

type Props = {
  readonly label: string;
  readonly tone?: Tone;
};

export function Pill({ label, tone = 'neutral' }: Props) {
  const background = tone === 'neutral' ? tokens.color.surface : tokens.color.score[tone];
  const textColor = tone === 'neutral' ? tokens.color.text : tokens.color.scoreInk[tone];

  return (
    <View style={[styles.base, { backgroundColor: background }]}>
      <AppText variant="small" weight="800" style={{ color: textColor }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.space[1],
    paddingHorizontal: tokens.space[2],
  },
});
