import { REMINDER_MINUTES_BEFORE } from '@/application/useCases/planActivity';
import {
  labelFor,
  type BadgeState,
  type EngineConfig,
  type HourScore,
  type LevelProgress,
  type LocalDateTime,
} from '@/domain';

import { formatHourRange } from '../../../format/hourRange';
import { t } from '../../../i18n/pt-BR';
import { AppText, CountUp, LevelBar, Pill, Reveal } from '../../../ui';
import { countdown } from '../countdown';
import type { HeroState } from '../heroState';
import { levelBarRight } from '../levelBarLabel';
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
  /** Coleção de conquistas, para o cartão de desbloqueio dar posição ao que foi conquistado.
   * A tela do dia nunca chega ao estado "done", então pode omitir. */
  readonly badgeTotals?: { readonly unlocked: number; readonly total: number } | undefined;
  /** Cidade em foco; um plano feito em outra cidade ganha um aviso discreto. Só a Home passa. */
  readonly cityId?: string;
  /** "Hoje" na Home; "outro dia" na tela do dia, onde a cópia não pode dizer "hoje" nem
   * prometer a folga de sequência, que só é registrada para o dia atual. */
  readonly scope?: HeroScope;
};

export type HeroScope = 'today' | 'otherDay';

const MINUTES_PER_HOUR = 60;
const NO_BADGES = { unlocked: 0, total: 0 } as const;

/** O plano é por dia, não por cidade (spec §5): ao trocar de cidade ele continua valendo, mas
 * o herói avisa de onde ele veio para o horário não parecer desta cidade. */
function OtherCityNote({
  planCityId,
  cityId,
}: {
  readonly planCityId: string;
  readonly cityId: string | undefined;
}) {
  if (cityId === undefined || planCityId === cityId) return null;
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
      <AppText variant="display">
        {formatHourRange(state.window.startHour, state.window.endHour)}
      </AppText>
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
  readonly cityId: string | undefined;
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
  readonly cityId: string | undefined;
}) {
  const { plan, nowScore } = state;
  const activity = config.activities[plan.activity];
  const windowHours = hoursInWindow(hours, plan.window.startHour, plan.window.endHour);
  return (
    <>
      <AppText variant="kicker">{t.home.windowStarted}</AppText>
      <AppText variant="display">
        {formatHourRange(plan.window.startHour, plan.window.endHour)}
      </AppText>
      <AppText variant="body">{t.home.planOf(activity.name, plan.window.startHour)}</AppText>
      {nowScore !== null ? (
        <Pill
          label={`${t.home.now}: ${t.labels[labelFor(nowScore, config)]} · ${nowScore}`}
          tone={labelFor(nowScore, config)}
        />
      ) : null}
      <OtherCityNote planCityId={plan.cityId} cityId={cityId} />
      <FactsRow facts={windowFacts(windowHours)} />
    </>
  );
}

function DoneBody({
  state,
  level,
  config,
  unlockedToday,
  badgeTotals,
}: {
  readonly state: Extract<HeroState, { kind: 'done' }>;
  readonly level: LevelProgress;
  readonly config: EngineConfig;
  readonly unlockedToday: readonly BadgeState[];
  readonly badgeTotals: { readonly unlocked: number; readonly total: number };
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
      <XpReceipt receipt={receipt} activity={record.activity} />
      <LevelBar
        progress={level.progress}
        left={t.level.short(level.level)}
        right={levelBarRight(level)}
      />
      {unlockedToday.map((badge, index) => (
        <Reveal key={badge.id}>
          <UnlockCard
            badge={badge}
            // Cada cartão conta a SUA posição na coleção. Passar o total a todos fazia duas
            // conquistas desbloqueadas juntas dizerem "2 de 8" as duas, em vez de "1 de 8" e
            // "2 de 8": a segunda contradizia a primeira na mesma rolagem.
            unlockedCount={badgeTotals.unlocked - unlockedToday.length + index + 1}
            total={badgeTotals.total}
          />
        </Reveal>
      ))}
    </>
  );
}

function LogNoPlanBody({ state }: { readonly state: Extract<HeroState, { kind: 'logNoPlan' }> }) {
  return (
    <>
      <AppText variant="kicker">{t.home.windowPassed}</AppText>
      {state.bestPast ? (
        <AppText variant="subtitle">
          {t.home.bestPastHour(state.bestPast.hour, state.bestPast.score)}
        </AppText>
      ) : null}
      {state.expiredPlan ? (
        <AppText variant="display">
          {t.home.planExpired(state.expiredPlan.window.startHour)}
        </AppText>
      ) : null}
    </>
  );
}

function NoWindowBody({
  state,
  scope,
}: {
  readonly state: Extract<HeroState, { kind: 'noWindow' }>;
  readonly scope: HeroScope;
}) {
  const result = state.day.result;
  const dominant = result.kind === 'none' ? result.dominant : null;
  const score = result.kind === 'none' ? (result.best?.score ?? null) : null;
  return (
    <>
      <AppText variant="title">{scope === 'today' ? t.home.noWindow : t.day.noWindow}</AppText>
      {dominant ? (
        <AppText variant="small">{t.home.noWindowBecause(t.reasons[dominant])}</AppText>
      ) : null}
      {scope === 'today' ? (
        <AppText variant="small" tone="muted">
          {t.home.restDayProtected}
        </AppText>
      ) : null}
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
  badgeTotals = NO_BADGES,
  cityId,
  scope = 'today',
}: Props) {
  switch (state.kind) {
    case 'plan':
      return <PlanBody state={state} kicker={scope === 'today' ? t.home.bestToday : t.day.best} />;
    case 'planned':
      return <PlannedBody state={state} now={now} hours={hours} config={config} cityId={cityId} />;
    case 'confirm':
      return <ConfirmBody state={state} hours={hours} config={config} cityId={cityId} />;
    case 'done':
      return (
        <DoneBody
          state={state}
          level={level}
          config={config}
          unlockedToday={unlockedToday}
          badgeTotals={badgeTotals}
        />
      );
    case 'logNoPlan':
      return <LogNoPlanBody state={state} />;
    case 'noWindow':
      return <NoWindowBody state={state} scope={scope} />;
  }
}
