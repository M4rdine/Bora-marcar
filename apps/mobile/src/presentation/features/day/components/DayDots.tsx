import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { tokens } from '../../../ui';
import { dayPosition } from '../daySwipe';

type Props = {
  readonly date: string;
  readonly dates: readonly string[];
};

const DOT = 6;

/**
 * Onde este dia está na semana prevista.
 *
 * Existe para o arrasto entre dias ser DESCOBRÍVEL. Um gesto sem marca na tela só é usado por
 * quem já sabe que ele existe, o que na prática significa por ninguém. Os pontos dizem duas
 * coisas de uma vez: que há mais dias ao lado, e quantos faltam para cada ponta.
 *
 * É decorativo para o leitor de tela — a posição vai no rótulo do grupo, porque sete pontos lidos
 * um a um não informam nada.
 */
export function DayDots({ date, dates }: Props) {
  const position = dayPosition(date, dates);
  if (position === null || position.total < 2) return null;
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={t.day.position(position.index + 1, position.total)}
    >
      {dates.map((d, i) => (
        <View key={d} style={[styles.dot, i === position.index ? styles.current : null]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space[1], alignItems: 'center' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: tokens.color.tabInactive,
  },
  current: { backgroundColor: tokens.color.text, width: DOT * 3 },
});
