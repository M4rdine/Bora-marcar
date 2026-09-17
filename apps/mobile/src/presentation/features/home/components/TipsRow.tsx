import { StyleSheet, View } from 'react-native';

import type { Tip } from '@/domain';

import { AppText, Icon, tipIcon, tokens } from '../../../ui';

/** O texto ao lado já diz a dica, então o desenho é decorativo. */
const TIP_ICON_SIZE = 16;

export function TipsRow({ tips }: { readonly tips: readonly Tip[] }) {
  if (tips.length === 0) return null;
  return (
    <View style={styles.row}>
      {tips.map((tip) => (
        <View key={tip.id} style={styles.chip}>
          <Icon name={tipIcon(tip.id)} size={TIP_ICON_SIZE} />
          <AppText variant="small">{tip.text}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    backgroundColor: tokens.color.surface,
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.space[1],
    paddingHorizontal: tokens.space[3],
  },
});
