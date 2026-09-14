import { ScrollView, StyleSheet } from 'react-native';

import { Chip, tokens } from '../../../ui';
import type { PickableHour } from '../pickableHours';

type Props = {
  readonly options: readonly PickableHour[];
  readonly selected: number;
  readonly onSelect: (hour: number) => void;
};

/** Chips horizontais de horas passadas do dia, usados para registrar uma atividade "em outro
 * horário": o selecionado fica em destaque e mostra o score daquela hora. */
export function HourPicker({ options, selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => (
        <Chip
          key={option.hour}
          label={`${option.hour}h`}
          active={option.hour === selected}
          score={option.score}
          onPress={() => onSelect(option.hour)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: tokens.space[2] },
});
