import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { City } from '@/application/ports';
import {
  addDays,
  type ActivityId,
  type DayRecommendation,
  type EngineConfig,
  type HourScore,
  type LevelProgress,
  type LocalDateTime,
  type Progress,
  type TimeWindow,
} from '@/domain';

import { formatDayTitle, formatLongDate } from '../../i18n/dates';
import { t } from '../../i18n/pt-BR';
import { useEngineConfig } from '../../queries/useEngineConfig';
import { useGamificationActions } from '../../queries/useGamificationActions';
import { useOverview } from '../../queries/useOverview';
import { useProgress } from '../../queries/useProgress';
import { usePreferences } from '../../state/preferencesStore';
import { AppText, Button, phaseFor, Sky, Surface, tokens } from '../../ui';
import { FactsRow } from '../home/components/FactsRow';
import { HeroBody } from '../home/components/HeroBody';
import { HourlyTimeline } from '../home/components/HourlyTimeline';
import type { HeroState } from '../home/heroState';
import { windowFacts } from '../home/windowFacts';

import { dayHeroState, type DayHeroState } from './dayHeroState';

type ActionErrorCode = 'alreadyDoneToday' | 'alreadyPlanned' | 'planNotFound' | 'alreadyConfirmed';

const isActionError = (e: unknown): e is { code: ActionErrorCode } =>
  typeof e === 'object' &&
  e !== null &&
  'code' in e &&
  typeof (e as { code: unknown }).code === 'string';

type PlanInput = {
  readonly city: City;
  readonly activity: ActivityId;
  readonly window: TimeWindow;
  readonly windowScore: number;
  readonly utcOffsetSeconds: number;
};

/** Planejar/desfazer para o dia visitado: mesma forma de `useHeroActions`, com as duas ações que
 * a tela do dia expõe. Os dados da ação (cidade, janela…) chegam no momento da chamada, não na
 * construção do hook, então ele pode ser usado incondicionalmente mesmo antes da previsão carregar. */
function useDayActions() {
  const gamification = useGamificationActions();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>) => {
    setErrorMessage(null);
    void fn().catch((e: unknown) => {
      setErrorMessage(isActionError(e) ? t.errors[e.code] : t.errors.network);
    });
  };
  return {
    onPlan: (input: PlanInput) => run(() => gamification.plan.mutateAsync(input)),
    onCancel: (planId: string) => run(() => gamification.cancel.mutateAsync(planId)),
    busy: gamification.plan.isPending || gamification.cancel.isPending,
    errorMessage,
  };
}

type ActionsResult = ReturnType<typeof useDayActions>;

/** Horas pontuadas dentro de `[startHour, endHour)`, como em `HeroBody`. */
const hoursInWindow = (
  hours: readonly HourScore[],
  startHour: number,
  endHour: number,
): readonly HourScore[] => hours.filter((h) => h.hour.hour >= startHour && h.hour.hour < endHour);

function DayHeader({
  date,
  today,
  tomorrow,
  onBack,
}: {
  readonly date: string;
  readonly today: string;
  readonly tomorrow: string;
  readonly onBack: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.day.back}
        onPress={onBack}
        style={styles.backButton}
      >
        <AppText variant="title">‹</AppText>
      </Pressable>
      <View>
        <AppText variant="title">{formatDayTitle(date, today, tomorrow)}</AppText>
        <AppText variant="small" tone="muted">
          {formatLongDate(date)}
        </AppText>
      </View>
    </View>
  );
}

function DayNotFound({ onBack }: { readonly onBack: () => void }) {
  return (
    <Surface strength="strong" radius="hero" padding={5} gap={3}>
      <AppText variant="body">{t.day.notFound}</AppText>
      <Button label={t.day.back} kind="quiet" onPress={onBack} />
    </Surface>
  );
}

type PlanSectionProps = {
  readonly state: Extract<DayHeroState, { kind: 'plan' }>;
  readonly now: LocalDateTime;
  readonly level: LevelProgress;
  readonly activityName: string;
  readonly city: City;
  readonly activity: ActivityId;
  readonly utcOffsetSeconds: number;
  readonly actions: ActionsResult;
};

function PlanSection({
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

function PlannedSection({
  state,
  hours,
  actions,
}: {
  readonly state: Extract<DayHeroState, { kind: 'planned' }>;
  readonly hours: readonly HourScore[];
  readonly actions: ActionsResult;
}) {
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

function NoWindowSection({
  state,
  now,
  level,
}: {
  readonly state: Extract<DayHeroState, { kind: 'noWindow' }>;
  readonly now: LocalDateTime;
  readonly level: LevelProgress;
}) {
  return (
    <HeroBody state={state} now={now} hours={state.day.hours} level={level} unlockedToday={[]} />
  );
}

function ViewOnlySection() {
  return (
    <AppText variant="small" tone="muted">
      {t.day.viewOnly}
    </AppText>
  );
}

type DayHeroBodyProps = {
  readonly heroState: DayHeroState;
  readonly now: LocalDateTime;
  readonly level: LevelProgress;
  readonly activityName: string;
  readonly hours: readonly HourScore[];
  readonly city: City;
  readonly activity: ActivityId;
  readonly utcOffsetSeconds: number;
  readonly actions: ActionsResult;
};

function DayHeroBody(props: DayHeroBodyProps) {
  const { heroState, now, level, activityName, hours, city, activity, utcOffsetSeconds, actions } =
    props;
  switch (heroState.kind) {
    case 'plan':
      return (
        <PlanSection
          state={heroState}
          now={now}
          level={level}
          activityName={activityName}
          city={city}
          activity={activity}
          utcOffsetSeconds={utcOffsetSeconds}
          actions={actions}
        />
      );
    case 'planned':
      return <PlannedSection state={heroState} hours={hours} actions={actions} />;
    case 'noWindow':
      return <NoWindowSection state={heroState} now={now} level={level} />;
    case 'viewOnly':
      return <ViewOnlySection />;
  }
}

type DayHeroProps = {
  readonly city: City;
  readonly activity: ActivityId;
  readonly date: string;
  readonly today: string;
  readonly tomorrow: string;
  readonly day: DayRecommendation;
  readonly now: LocalDateTime;
  readonly config: EngineConfig;
  readonly progress: Progress;
  readonly actions: ActionsResult;
};

function DayHero({
  city,
  activity,
  date,
  today,
  tomorrow,
  day,
  now,
  config,
  progress,
  actions,
}: DayHeroProps) {
  const plan = progress.plansByDate.get(date) ?? null;
  const heroState = dayHeroState({ day, date, today, tomorrow, plan });
  const activityName = config.activities[day.activityId].name;
  return (
    <>
      <Surface strength="strong" radius="hero" padding={5} gap={3}>
        <DayHeroBody
          heroState={heroState}
          now={now}
          level={progress.level}
          activityName={activityName}
          hours={day.hours}
          city={city}
          activity={activity}
          utcOffsetSeconds={now.utcOffsetSeconds}
          actions={actions}
        />
        {actions.errorMessage ? (
          <AppText variant="small" style={styles.error}>
            {actions.errorMessage}
          </AppText>
        ) : null}
      </Surface>
      <HourlyTimeline
        hours={day.hours}
        nowHour={null}
        sunrise={day.daily?.sunrise ?? null}
        sunset={day.daily?.sunset ?? null}
      />
    </>
  );
}

type ContentProps = {
  readonly city: City;
  readonly activity: ActivityId;
  readonly date: string;
  readonly today: string;
  readonly tomorrow: string;
  readonly day: DayRecommendation | null;
  readonly now: LocalDateTime;
  readonly config: EngineConfig;
  readonly progress: Progress;
  readonly actions: ActionsResult;
  readonly onBack: () => void;
};

function DayContent(props: ContentProps) {
  const { date, today, tomorrow, day, onBack } = props;
  return (
    <>
      <DayHeader date={date} today={today} tomorrow={tomorrow} onBack={onBack} />
      {day === null ? (
        <DayNotFound onBack={onBack} />
      ) : (
        <DayHero
          city={props.city}
          activity={props.activity}
          date={date}
          today={today}
          tomorrow={tomorrow}
          day={day}
          now={props.now}
          config={props.config}
          progress={props.progress}
          actions={props.actions}
        />
      )}
    </>
  );
}

export function DayScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<'/day/[date]'>();
  const city = usePreferences((s) => s.city);
  const activity = usePreferences((s) => s.activity);
  const config = useEngineConfig();
  const overview = useOverview(city, activity);
  const today = overview.snapshot?.now.date ?? null;
  const progress = useProgress(today);
  const actions = useDayActions();
  const isToday = today !== null && date === today;

  useEffect(() => {
    if (isToday) router.replace('/');
  }, [isToday, router]);

  const snapshot = overview.snapshot;
  const day =
    snapshot && !isToday ? (snapshot.overview.nextDays.find((d) => d.date === date) ?? null) : null;
  const isBadDay =
    day !== null &&
    day.bestScoreOfDay !== null &&
    config.data !== undefined &&
    day.bestScoreOfDay < config.data.scores.fair;
  const phase = snapshot
    ? phaseFor({ now: { ...snapshot.now, hour: 12 }, daily: day?.daily ?? null, isBadDay })
    : 'day';
  const ready =
    city !== null && snapshot !== null && config.data !== undefined && progress.data !== undefined;

  return (
    <Sky phase={phase}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          {ready && city && snapshot && config.data && progress.data && today && !isToday ? (
            <DayContent
              city={city}
              activity={activity}
              date={date}
              today={today}
              tomorrow={addDays(today, 1)}
              day={day}
              now={snapshot.now}
              config={config.data}
              progress={progress.data}
              actions={actions}
              onBack={() => router.back()}
            />
          ) : (
            <AppText variant="small">{t.home.loading}</AppText>
          )}
        </ScrollView>
      </SafeAreaView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: tokens.space[4], gap: tokens.space[3] },
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  backButton: { padding: tokens.space[2] },
  error: { color: tokens.color.danger },
});
