import { StyleSheet, View } from 'react-native';

import type { BadgeState, EngineConfig, HourScore, LevelProgress, LocalDateTime } from '@/domain';

import { AppText, Surface, tokens } from '../../../ui';
import type { HeroState } from '../heroState';
import type { HeroActionsResult } from '../useHeroActions';

import { HeroActions } from './HeroActions';
import { HeroBody } from './HeroBody';

type Props = {
  readonly state: HeroState;
  readonly config: EngineConfig;
  readonly now: LocalDateTime;
  /** Horas pontuadas do dia de hoje (para a previsão da janela no estado `planned`). */
  readonly hours: readonly HourScore[];
  readonly level: LevelProgress;
  readonly actions: HeroActionsResult;
  readonly unlockedToday: readonly BadgeState[];
};

export function HeroCard({ state, config, now, hours, level, actions, unlockedToday }: Props) {
  return (
    <Surface
      strength="strong"
      radius="hero"
      padding={5}
      gap={3}
      style={styles.card}
      accessibilityLabel="hero"
    >
      <View pointerEvents="none" style={styles.glow} />
      <HeroBody state={state} now={now} hours={hours} level={level} unlockedToday={unlockedToday} />
      <HeroActions
        state={state}
        config={config}
        now={now}
        busy={actions.busy}
        pickableHours={actions.pickableHours}
        onPlan={actions.onPlan}
        onCancel={actions.onCancel}
        onConfirm={actions.onConfirm}
        onLogNow={actions.onLogNow}
      />
      {actions.errorMessage ? (
        <AppText variant="small" style={styles.error}>
          {actions.errorMessage}
        </AppText>
      ) : null}
    </Surface>
  );
}

const GLOW = tokens.size.glow;

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  glow: {
    position: 'absolute',
    top: -tokens.space[10],
    right: -tokens.space[10],
    width: GLOW,
    height: GLOW,
    borderRadius: GLOW / 2,
    backgroundColor: tokens.color.gold,
    opacity: 0.35,
  },
  error: { color: tokens.color.danger },
});
