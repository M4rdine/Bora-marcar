import { StyleSheet } from 'react-native';

import type {
  BadgeState,
  DayRecommendation,
  EngineConfig,
  HourScore,
  LevelProgress,
  LocalDateTime,
} from '@/domain';

import { AppText, Surface, tokens } from '../../../ui';
import type { HeroState } from '../heroState';
import type { HeroActionsResult } from '../useHeroActions';

import { HeroActions } from './HeroActions';
import { HeroBody } from './HeroBody';
import { HeroGlow } from './HeroGlow';

type Props = {
  readonly state: HeroState;
  readonly config: EngineConfig;
  readonly cityId: string;
  readonly now: LocalDateTime;
  /** Horas pontuadas do dia de hoje (para a previsão da janela no estado `planned`). */
  readonly hours: readonly HourScore[];
  /** Primeiro dia da previsão depois de hoje, quando existe: fonte dos atalhos para amanhã. */
  readonly tomorrow: DayRecommendation | null;
  readonly level: LevelProgress;
  readonly actions: HeroActionsResult;
  readonly unlockedToday: readonly BadgeState[];
  readonly badgeTotals?: { readonly unlocked: number; readonly total: number } | undefined;
  readonly onOpenTomorrow: () => void;
};

export function HeroCard({
  state,
  config,
  cityId,
  now,
  hours,
  tomorrow,
  level,
  actions,
  unlockedToday,
  badgeTotals,
  onOpenTomorrow,
}: Props) {
  return (
    <Surface
      strength="strong"
      radius="hero"
      padding={5}
      gap={3}
      style={styles.card}
      accessibilityLabel="hero"
    >
      <HeroGlow />
      <HeroBody
        state={state}
        now={now}
        hours={hours}
        level={level}
        config={config}
        cityId={cityId}
        unlockedToday={unlockedToday}
        badgeTotals={badgeTotals}
      />
      <HeroActions
        state={state}
        config={config}
        now={now}
        tomorrow={tomorrow}
        busy={actions.busy}
        pickableHours={actions.pickableHours}
        onPlan={actions.onPlan}
        onCancel={actions.onCancel}
        onConfirm={actions.onConfirm}
        onLogNow={actions.onLogNow}
        onOpenTomorrow={onOpenTomorrow}
      />
      {actions.errorMessage ? (
        <AppText variant="small" style={styles.error}>
          {actions.errorMessage}
        </AppText>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  error: { color: tokens.color.danger },
});
