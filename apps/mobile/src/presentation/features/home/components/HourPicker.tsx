import { ScrollView, StyleSheet } from 'react-native';

import { Chip, tokens } from '../../../ui';
import type { PickableHour } from '../pickableHours';

type Props = {
  readonly options: readonly PickableHour[];
  readonly selected: number;
  readonly onSelect: (hour: number) => void;
};

/** Chips horizontais de horas passadas do dia, usados para registrar uma atividade "em outro
 * horário": o selecionado fica em destaque e mostra o score daquela hora. A ordem é decrescente
 * para a hora atual (pré-selecionada) aparecer primeiro, sem rolar. */
export function HourPicker({ options, selected, onSelect }: Props) {
  const latestFirst = [...options].sort((a, b) => b.hour - a.hour);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {latestFirst.map((option) => (
        <Chip
          key={option.hour}
          label={`${option.hour}h`}
          active={option.hour === selected}
          score={option.score}
          scoreLabel={option.label}
          onPress={() => onSelect(option.hour)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space[2] },
});
