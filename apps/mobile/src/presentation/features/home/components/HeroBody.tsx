import { REMINDER_MINUTES_BEFORE } from '@/application/useCases/planActivity';
import {
  labelFor,
  type BadgeState,
  type EngineConfig,
  type HourScore,
  type LevelProgress,
  type LocalDateTime,
} from '@/domain';

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
  readonly config: EngineConfig;
  readonly unlockedToday: readonly BadgeState[];
  /** Cidade em foco; um plano feito em outra cidade ganha um aviso discreto. `null` fora da Home. */
  readonly cityId: string | null;
  /** Kicker do estado `plan`; a tela do dia troca "Melhor horário hoje" por "Melhor horário". */
  readonly kicker?: string;
};

const MINUTES_PER_HOUR = 60;

/** O plano é por dia, não por cidade (spec §5): ao trocar de cidade ele continua valendo, mas
 * o herói avisa de onde ele veio para o horário não parecer desta cidade. */
function OtherCityNote({
  planCityId,
  cityId,
}: {
  readonly planCityId: string;
  readonly cityId: string | null;
}) {
  if (cityId === null || planCityId === cityId) return null;
  return (
    <AppText variant="small" tone="muted">
      {t.home.otherCityPlan}
    </AppText>
  );
}

function PlanBody({
  state,
  kicker,
}: {
  readonly state: Extract<HeroState, { kind: 'plan' }>;
  readonly kicker: string;
}) {
  const hours = state.day.result.kind === 'window' ? state.day.result.hours : [];
  return (
    <>
      <AppText variant="kicker">{kicker}</AppText>
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
  config,
  cityId,
}: {
  readonly state: Extract<HeroState, { kind: 'planned' }>;
  readonly now: LocalDateTime;
  readonly hours: readonly HourScore[];
  readonly config: EngineConfig;
  readonly cityId: string | null;
}) {
  const { plan } = state;
  const left = countdown(now, plan.window.startHour);
  const reminderTotal = plan.window.startHour * MINUTES_PER_HOUR - REMINDER_MINUTES_BEFORE;
  const reminderHour = Math.floor(reminderTotal / MINUTES_PER_HOUR);
  const reminderMinute = reminderTotal % MINUTES_PER_HOUR;
  const windowHours = hoursInWindow(hours, plan.window.startHour, plan.window.endHour);
  return (
    <>
      <AppText variant="kicker">{t.home.plannedKicker}</AppText>
      <AppText variant="display">
        {t.home.plannedTitle(config.activities[plan.activity].name, plan.window.startHour)}
      </AppText>
      {left ? <AppText variant="body">{t.home.startsIn(left.hours, left.minutes)}</AppText> : null}
      <AppText variant="small" tone="muted">
        {t.home.reminderAt(reminderHour, reminderMinute)}
      </AppText>
      <OtherCityNote planCityId={plan.cityId} cityId={cityId} />
      <FactsRow facts={windowFacts(windowHours)} />
    </>
  );
}

function ConfirmBody({
  state,
  hours,
  config,
  cityId,
}: {
  readonly state: Extract<HeroState, { kind: 'confirm' }>;
  readonly hours: readonly HourScore[];
  readonly config: EngineConfig;
  readonly cityId: string | null;
}) {
  const { plan } = state;
  const activity = config.activities[plan.activity];
  const windowHours = hoursInWindow(hours, plan.window.startHour, plan.window.endHour);
  const nowLabel = state.nowScore === null ? null : labelFor(state.nowScore, config);
  return (
    <>
      <AppText variant="kicker">{t.home.windowStarted}</AppText>
      <AppText variant="display">{`${plan.window.startHour}h – ${plan.window.endHour}h`}</AppText>
      <AppText variant="body">
        {t.home.planOf(activity.emoji, activity.name, plan.window.startHour)}
      </AppText>
      {nowLabel !== null && state.nowScore !== null ? (
        <Pill label={`${t.home.now}: ${t.labels[nowLabel]} · ${state.nowScore}`} tone={nowLabel} />
      ) : null}
      <OtherCityNote planCityId={plan.cityId} cityId={cityId} />
      <FactsRow facts={windowFacts(windowHours)} />
    </>
  );
}

/** "90 / 100 XP" dentro do nível atual; no último nível, "Nível máximo". */
function levelBarRight(level: LevelProgress): string {
  if (level.nextLevelXp === null) return t.profile.maxLevel;
  return t.level.xpWithin(
    level.totalXp - level.levelStartXp,
    level.nextLevelXp - level.levelStartXp,
  );
}

function DoneBody({
  state,
  level,
  config,
  unlockedToday,
}: {
  readonly state: Extract<HeroState, { kind: 'done' }>;
  readonly level: LevelProgress;
  readonly config: EngineConfig;
  readonly unlockedToday: readonly BadgeState[];
}) {
  const { record } = state;
  const activity = config.activities[record.activity];
  const receipt = xpReceipt(record);
  return (
    <>
      <AppText variant="kicker">
        {t.home.doneKicker(activity.name, record.hourLeft, record.minuteLeft)}
      </AppText>
      <CountUp value={record.xp.total} format={t.home.xpEarned} />
      <XpReceipt receipt={receipt} activityEmoji={activity.emoji} />
      <LevelBar
        progress={level.progress}
        left={t.level.short(level.level)}
        right={levelBarRight(level)}
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
      <AppText variant="small" tone="muted">
        {t.home.restDayProtected}
      </AppText>
      {score !== null ? <Pill label={`${t.labels.poor} · ${score}`} tone="poor" /> : null}
    </>
  );
}

export function HeroBody({
  state,
  now,
  hours,
  level,
  config,
  unlockedToday,
  cityId,
  kicker,
}: Props) {
  switch (state.kind) {
    case 'plan':
      return <PlanBody state={state} kicker={kicker ?? t.home.bestToday} />;
    case 'planned':
      return <PlannedBody state={state} now={now} hours={hours} config={config} cityId={cityId} />;
    case 'confirm':
      return <ConfirmBody state={state} hours={hours} config={config} cityId={cityId} />;
    case 'done':
      return <DoneBody state={state} level={level} config={config} unlockedToday={unlockedToday} />;
    case 'logNoPlan':
      return <LogNoPlanBody state={state} />;
    case 'noWindow':
      return <NoWindowBody state={state} />;
  }
}
