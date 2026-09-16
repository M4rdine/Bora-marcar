import { StyleSheet } from 'react-native';

import type { City } from '@/application/ports';
import type {
  ActivityId,
  DayRecommendation,
  EngineConfig,
  HourScore,
  LevelProgress,
  LocalDateTime,
  Progress,
} from '@/domain';

import { buildDaySequence, HourlyChronology } from '../../../chronology';
import { formatDayTitle } from '../../../i18n/dates';
import { t } from '../../../i18n/pt-BR';
import { AppText, Surface, tokens } from '../../../ui';
import { dayHeroState, type DayHeroState } from '../dayHeroState';
import type { DayActionsResult } from '../useDayActions';

import { NoWindowSection, PlannedSection, PlanSection, ViewOnlySection } from './DaySections';
import { HourlyTimeline } from './HourlyTimeline';

type DayHeroBodyProps = {
  readonly heroState: DayHeroState;
  readonly now: LocalDateTime;
  readonly level: LevelProgress;
  readonly activityName: string;
  readonly config: EngineConfig;
  readonly hours: readonly HourScore[];
  readonly city: City;
  readonly activity: ActivityId;
  readonly utcOffsetSeconds: number;
  readonly actions: DayActionsResult;
};

function DayHeroBody(props: DayHeroBodyProps) {
  const {
    heroState,
    now,
    level,
    activityName,
    config,
    hours,
    city,
    activity,
    utcOffsetSeconds,
    actions,
  } = props;
  switch (heroState.kind) {
    case 'plan':
      return (
        <PlanSection
          state={heroState}
          now={now}
          level={level}
          activityName={activityName}
          config={config}
          city={city}
          activity={activity}
          utcOffsetSeconds={utcOffsetSeconds}
          actions={actions}
        />
      );
    case 'planned':
      return <PlannedSection state={heroState} hours={hours} config={config} actions={actions} />;
    case 'noWindow':
      return <NoWindowSection state={heroState} now={now} level={level} config={config} />;
    case 'viewOnly':
      return <ViewOnlySection />;
  }
}

type Props = {
  readonly city: City;
  readonly activity: ActivityId;
  readonly date: string;
  readonly today: string;
  readonly tomorrow: string;
  readonly day: DayRecommendation;
  readonly now: LocalDateTime;
  readonly config: EngineConfig;
  readonly progress: Progress;
  readonly actions: DayActionsResult;
};

export function DayHero({
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
}: Props) {
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
          config={config}
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
      {/* O gráfico acima dá a forma do dia de relance; a cronologia abaixo é o detalhe, com o
          porquê de cada nota e o plano na hora que a pessoa escolher. */}
      <HourlyChronology
        sequence={buildDaySequence(day)}
        profile={config.activities[activity]}
        title={t.chronology.dayTitle}
        subtitle={t.chronology.subtitle}
        showDayHeadings={false}
        dayLabelFor={() => formatDayTitle(date, today, tomorrow)}
        onPlanHour={
          heroState.kind === 'plan' || heroState.kind === 'noWindow'
            ? (item) =>
                actions.onPlan({
                  city,
                  activity,
                  window: {
                    date: item.hour.hour.date,
                    startHour: item.hour.hour.hour,
                    endHour: item.hour.hour.hour + 1,
                  },
                  windowScore: item.hour.score,
                  utcOffsetSeconds: now.utcOffsetSeconds,
                })
            : null
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  error: { color: tokens.color.danger },
});
