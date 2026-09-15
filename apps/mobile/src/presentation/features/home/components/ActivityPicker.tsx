import { ScrollView, StyleSheet } from 'react-native';

import { ACTIVITY_IDS, labelFor, type ActivityId, type EngineConfig } from '@/domain';

import { Chip, tokens } from '../../../ui';

type Props = {
  readonly config: EngineConfig;
  readonly selected: ActivityId;
  readonly onSelect: (id: ActivityId) => void;
  /** Score da atividade ATIVA (calculado só para ela); inativas não mostram score. */
  readonly scoreFor?: ((id: ActivityId) => number | null) | undefined;
};

export function ActivityPicker({ config, selected, onSelect, scoreFor }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {ACTIVITY_IDS.map((id) => {
        const profile = config.activities[id];
        const active = id === selected;
        const score = active ? (scoreFor?.(id) ?? null) : null;
        return (
          <Chip
            key={id}
            label={profile.name}
            emoji={profile.emoji}
            active={active}
            score={score}
            scoreLabel={score === null ? undefined : labelFor(score, config)}
            onPress={() => onSelect(id)}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: tokens.space[2], paddingVertical: tokens.space[2] },
});
