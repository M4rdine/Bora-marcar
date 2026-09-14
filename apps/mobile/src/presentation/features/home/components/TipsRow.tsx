import { StyleSheet, View } from 'react-native';

import type { Tip } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { AppText, tokens } from '../../../ui';

export function TipsRow({ tips }: { readonly tips: readonly Tip[] }) {
  if (tips.length === 0) return null;
  return (
    <View style={styles.row}>
      {tips.map((tip) => (
        <View key={tip.id} style={styles.chip}>
          <AppText variant="small">{`${t.tipEmoji[tip.id]} ${tip.text}`}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  chip: {
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.space[1],
    paddingHorizontal: tokens.space[3],
  },
});
