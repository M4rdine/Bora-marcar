import type { City } from '@/application/ports';
import type { ActivityId, HourScore, LevelProgress, LocalDateTime } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { AppText, Button } from '../../../ui';
import { FactsRow } from '../../home/components/FactsRow';
import { HeroBody } from '../../home/components/HeroBody';
import type { HeroState } from '../../home/heroState';
import { hoursInWindow, windowFacts } from '../../home/windowFacts';
import type { DayHeroState } from '../dayHeroState';
import type { DayActionsResult } from '../useDayActions';

type PlanSectionProps = {
  readonly state: Extract<DayHeroState, { kind: 'plan' }>;
  readonly now: LocalDateTime;
  readonly level: LevelProgress;
  readonly activityName: string;
  readonly city: City;
  readonly activity: ActivityId;
  readonly utcOffsetSeconds: number;
  readonly actions: DayActionsResult;
};

export function PlanSection({
  state,
  now,
  level,
  activityName,
  city,
  activity,
  utcOffsetSeconds,
  actions,
}: PlanSectionProps) {
  const synthetic: HeroState = {
    kind: 'plan',
    day: state.day,
    window: state.window,
    score: state.score,
  };
  const onPress = () =>
    actions.onPlan({
      city,
      activity,
      window: state.window,
      windowScore: state.score,
      utcOffsetSeconds,
    });
  return (
    <>
      <HeroBody
        state={synthetic}
        now={now}
        hours={state.day.hours}
        level={level}
        unlockedToday={[]}
      />
      <Button
        label={t.day.planTomorrow(activityName, state.window.startHour)}
        onPress={onPress}
        disabled={actions.busy}
      />
    </>
  );
}

type PlannedSectionProps = {
  readonly state: Extract<DayHeroState, { kind: 'planned' }>;
  readonly hours: readonly HourScore[];
  readonly actions: DayActionsResult;
};

export function PlannedSection({ state, hours, actions }: PlannedSectionProps) {
  const windowHours = hoursInWindow(hours, state.plan.window.startHour, state.plan.window.endHour);
  return (
    <>
      <AppText variant="kicker">{t.home.plannedKicker}</AppText>
      <AppText variant="display">{t.home.planned(state.plan.window.startHour)}</AppText>
      <FactsRow facts={windowFacts(windowHours)} />
      <Button
        label={t.home.cancelPlan}
        kind="quiet"
        onPress={() => actions.onCancel(state.plan.planId)}
        disabled={actions.busy}
      />
    </>
  );
}

type NoWindowSectionProps = {
  readonly state: Extract<DayHeroState, { kind: 'noWindow' }>;
  readonly now: LocalDateTime;
  readonly level: LevelProgress;
};

export function NoWindowSection({ state, now, level }: NoWindowSectionProps) {
  return (
    <HeroBody state={state} now={now} hours={state.day.hours} level={level} unlockedToday={[]} />
  );
}

export function ViewOnlySection() {
  return (
    <AppText variant="small" tone="muted">
      {t.day.viewOnly}
    </AppText>
  );
}
