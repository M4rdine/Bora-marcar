import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { ACTIVITY_IDS, type ActivityId, type EngineConfig } from '@/domain';

type Props = {
  readonly config: EngineConfig;
  readonly selected: ActivityId;
  readonly onSelect: (id: ActivityId) => void;
};

export function ActivityPicker({ config, selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {ACTIVITY_IDS.map((id) => {
        const p = config.activities[id];
        const active = id === selected;
        return (
          <Pressable
            key={id}
            onPress={() => onSelect(id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text
              style={active ? styles.chipTextActive : styles.chipText}
            >{`${p.emoji} ${p.name}`}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#eee' },
  chipActive: { backgroundColor: '#333' },
  chipText: { color: '#333' },
  chipTextActive: { color: '#fff' },
});
