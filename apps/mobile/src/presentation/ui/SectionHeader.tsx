import { StyleSheet, View } from 'react-native';

import { AppText } from './Text';
import { tokens } from './tokens';

type Props = {
  readonly title: string;
  readonly aside?: string;
};

export function SectionHeader({ title, aside }: Props) {
  return (
    <View style={styles.row}>
      <AppText variant="subtitle">{title}</AppText>
      {aside !== undefined ? (
        <AppText variant="small" tone="muted">
          {aside}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: tokens.space[2],
  },
});
