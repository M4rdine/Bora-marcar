import { Pressable, StyleSheet, View } from 'react-native';

import { formatDayTitle, formatLongDate } from '../../../i18n/dates';
import { t } from '../../../i18n/pt-BR';
import { AppText, Icon, tokens } from '../../../ui';

type Props = {
  readonly date: string;
  readonly today: string;
  readonly tomorrow: string;
  readonly onBack: () => void;
};

export function DayHeader({ date, today, tomorrow, onBack }: Props) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.day.back}
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
      >
        <Icon name="back" size={ICON_SIZE} color={tokens.color.text} />
      </Pressable>
      <View>
        <AppText variant="title">{formatDayTitle(date, today, tomorrow)}</AppText>
        <AppText variant="small" tone="muted">
          {formatLongDate(date)}
        </AppText>
      </View>
    </View>
  );
}

const ICON_SIZE = 22;

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  // 44pt é o mínimo de alvo de toque da Apple; a caixa visível é menor, a de toque não.
  backButton: {
    minWidth: tokens.size.minTouch,
    minHeight: tokens.size.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
