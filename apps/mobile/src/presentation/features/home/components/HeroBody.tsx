import { REMINDER_MINUTES_BEFORE } from '@/application/useCases/planActivity';
import type { BadgeState, HourScore, LevelProgress, LocalDateTime } from '@/domain';

import { t } from '../../../i18n/pt-BR';
import { AppText, CountUp, LevelBar, Pill, Reveal } from '../../../ui';
import { countdown } from '../countdown';
import type { HeroState } from '../heroState';
import { hoursInWindow, windowFacts } from '../windowFacts';
import { xpReceipt } from '../xpReceipt';

import { FactsRow } from './FactsRow';
import { TipsRow } from './TipsRow';
import { UnlockCard } from './UnlockCard';
import { XpReceipt } from './XpReceipt';

type Props = {
  readonly state: HeroState;
  readonly now: LocalDateTime;
  readonly hours: readonly HourScore[];
  readonly level: LevelProgress;
  readonly unlockedToday: readonly BadgeState[];
};

function PlanBody({ state }: { readonly state: Extract<HeroState, { kind: 'plan' }> }) {
  const hours = state.day.result.kind === 'window' ? state.day.result.hours : [];
  return (
    <>
      <AppText variant="kicker">{t.home.bestToday}</AppText>
      <Pill
        label={`${t.labels[state.day.label ?? 'poor']} · ${state.score}`}
        tone={state.day.label ?? 'poor'}
      />
      <AppText variant="display">{`${state.window.startHour}h – ${state.window.endHour}h`}</AppText>
      {state.day.sentence ? <AppText variant="body">{state.day.sentence}</AppText> : null}
      {state.day.caveat ? (
        <AppText variant="small" tone="muted">
          {state.day.caveat}
        </AppText>
      ) : null}
      <FactsRow facts={windowFacts(hours)} />
      <TipsRow tips={state.day.tips} />
    </>
  );
}

function PlannedBody({
  state,
  now,
  hours,
}: {
  readonly state: Extract<HeroState, { kind: 'planned' }>;
  readonly now: LocalDateTime;
  readonly hours: readonly HourScore[];
}) {
  const left = countdown(now, state.plan.window.startHour);
  const reminderTotal = state.plan.window.startHour * 60 - REMINDER_MINUTES_BEFORE;
  const reminderHour = Math.floor(reminderTotal / 60);
  const reminderMinute = reminderTotal % 60;
  const windowHours = hoursInWindow(hours, state.plan.window.startHour, state.plan.window.endHour);
  return (
    <>
      <AppText variant="kicker">{t.home.plannedKicker}</AppText>
      <AppText variant="display">{t.home.planned(state.plan.window.startHour)}</AppText>
      {left ? <AppText variant="body">{t.home.startsIn(left.hours, left.minutes)}</AppText> : null}
      <AppText variant="small" tone="muted">
        {t.home.reminderAt(reminderHour, reminderMinute)}
      </AppText>
      <FactsRow facts={windowFacts(windowHours)} />
    </>
  );
}

function ConfirmBody({ state }: { readonly state: Extract<HeroState, { kind: 'confirm' }> }) {
  return (
    <>
      <AppText variant="kicker">{t.home.windowStarted}</AppText>
      <AppText variant="display">
        {`${state.plan.window.startHour}h – ${state.plan.window.endHour}h`}
      </AppText>
      {state.nowScore !== null ? <Pill label={`${t.home.now} · ${state.nowScore}`} /> : null}
    </>
  );
}

function DoneBody({
  state,
  level,
  unlockedToday,
}: {
  readonly state: Extract<HeroState, { kind: 'done' }>;
  readonly level: LevelProgress;
  readonly unlockedToday: readonly BadgeState[];
}) {
  const receipt = xpReceipt(state.record);
  return (
    <>
      <AppText variant="kicker">
        {t.home.done(state.record.hourLeft, state.record.minuteLeft)}
      </AppText>
      <CountUp value={state.record.xp.total} format={t.home.xpEarned} />
      <XpReceipt receipt={receipt} />
      <LevelBar
        progress={level.progress}
        left={t.level.short(level.level)}
        right={level.xpToNext !== null ? `${level.xpToNext} XP` : t.profile.maxLevel}
      />
      {unlockedToday.map((badge) => (
        <Reveal key={badge.id}>
          <UnlockCard badge={badge} />
        </Reveal>
      ))}
    </>
  );
}

function LogNoPlanBody({ state }: { readonly state: Extract<HeroState, { kind: 'logNoPlan' }> }) {
  return (
    <>
      <AppText variant="kicker">{t.home.windowPassed}</AppText>
      {state.expiredPlan ? (
        <AppText variant="display">
          {t.home.planExpired(state.expiredPlan.window.startHour)}
        </AppText>
      ) : null}
    </>
  );
}

function NoWindowBody({ state }: { readonly state: Extract<HeroState, { kind: 'noWindow' }> }) {
  const result = state.day.result;
  const dominant = result.kind === 'none' ? result.dominant : null;
  const score = result.kind === 'none' ? (result.best?.score ?? null) : null;
  return (
    <>
      <AppText variant="title">{t.home.noWindow}</AppText>
      {dominant ? (
        <AppText variant="small">{t.home.noWindowBecause(t.reasons[dominant])}</AppText>
      ) : null}
      {score !== null ? <Pill label={`${t.labels.poor} · ${score}`} tone="poor" /> : null}
    </>
  );
}

export function HeroBody({ state, now, hours, level, unlockedToday }: Props) {
  switch (state.kind) {
    case 'plan':
      return <PlanBody state={state} />;
    case 'planned':
      return <PlannedBody state={state} now={now} hours={hours} />;
    case 'confirm':
      return <ConfirmBody state={state} />;
    case 'done':
      return <DoneBody state={state} level={level} unlockedToday={unlockedToday} />;
    case 'logNoPlan':
      return <LogNoPlanBody state={state} />;
    case 'noWindow':
      return <NoWindowBody state={state} />;
  }
}
