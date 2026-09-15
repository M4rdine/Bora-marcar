import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { AppText, Surface, tokens } from '../../../ui';
import type { XpReceiptResult } from '../xpReceipt';

type Props = { readonly receipt: XpReceiptResult; readonly activityEmoji: string };

/** Emoji de cada parcela, como no mockup; a base usa o emoji da atividade registrada. */
const ROW_EMOJI = { hour: '🌤', plan: '🎯', streak: '🔥' } as const;

export function XpReceipt({ receipt, activityEmoji }: Props) {
  return (
    <Surface strength="shade" padding={3} gap={2}>
      {receipt.rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <AppText variant="small">
            {`${row.key === 'base' ? activityEmoji : ROW_EMOJI[row.key]} ${row.label}`}
          </AppText>
          <AppText variant="small" tabular weight="700">
            {row.value}
          </AppText>
        </View>
      ))}
      <View style={[styles.row, styles.total]}>
        <AppText variant="small" weight="800">
          {t.receipt.total}
        </AppText>
        <AppText variant="small" tabular weight="800">
          {receipt.total}
        </AppText>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  total: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: tokens.color.border,
    paddingTop: tokens.space[2],
  },
});
