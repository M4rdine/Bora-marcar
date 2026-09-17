import { StyleSheet, View } from 'react-native';

import type { ActivityId } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { activityIcon, AppText, Icon, Surface, tokens, type IconName } from '../../../ui';
import type { XpReceiptResult } from '../xpReceipt';

type Props = { readonly receipt: XpReceiptResult; readonly activity: ActivityId };

/**
 * Ícone de cada parcela; a base usa o desenho da atividade registrada.
 *
 * A sequência já usou `thermal` — um termômetro ilustrando "3 dias seguidos", que não quer dizer
 * nada — e depois `star`, que não queria dizer nada de errado mas era um SEGUNDO símbolo para o
 * mesmo conceito: fogo na faixa da Home, no calendário e nos placares, estrela aqui. Agora é a
 * chama nos quatro lugares.
 */
const ROW_ICON = { hour: 'today', plan: 'medal', streak: 'flame' } as const satisfies Record<
  'hour' | 'plan' | 'streak',
  IconName
>;
const ICON_SIZE = 16;

export function XpReceipt({ receipt, activity }: Props) {
  return (
    <Surface strength="shade" padding={3} gap={2}>
      {receipt.rows.map((row) => (
        <View
          key={row.key}
          style={styles.row}
          accessible
          accessibilityLabel={`${row.label}: ${row.value}`}
        >
          <View style={styles.labelRow}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Icon
                name={row.key === 'base' ? activityIcon(activity) : ROW_ICON[row.key]}
                size={ICON_SIZE}
                color={tokens.color.text}
              />
            </View>
            <AppText variant="small">{row.label}</AppText>
          </View>
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
  labelRow: { flexDirection: 'row', gap: tokens.space[1] },
  total: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: tokens.color.border,
    paddingTop: tokens.space[2],
  },
});
