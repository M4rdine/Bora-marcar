import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { Surface, tokens } from '../../../ui';

/** Altura da linha de cidade: `tokens.size` ainda não define `cityRow`, então usamos este fallback. */
const CITY_ROW_HEIGHT = 64;

type Props = {
  readonly rows?: number;
};

export function CitySkeleton({ rows = 3 }: Props) {
  return (
    <View style={styles.list} accessibilityLabel={t.cities.searching}>
      {Array.from({ length: rows }, (_, i) => (
        <Surface
          key={i}
          strength="soft"
          radius="card"
          style={[styles.row, { height: CITY_ROW_HEIGHT }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: tokens.space[4], gap: tokens.space[3] },
  row: { opacity: 0.6 },
});
