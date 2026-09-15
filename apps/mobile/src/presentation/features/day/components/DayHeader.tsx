import { Pressable, StyleSheet, View } from 'react-native';

import { formatDayTitle, formatLongDate } from '../../../i18n/dates';
import { t } from '../../../i18n/pt-BR';
import { AppText, tokens } from '../../../ui';

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
        style={styles.backButton}
      >
        <AppText variant="title">{t.day.backGlyph}</AppText>
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

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  backButton: { padding: tokens.space[2] },
});
