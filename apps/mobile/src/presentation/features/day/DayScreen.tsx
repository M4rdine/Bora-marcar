import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { City } from '@/application/ports';
import type { OverviewSnapshot } from '@/application/useCases/buildOverview';
import {
  addDays,
  type ActivityId,
  type DayRecommendation,
  type EngineConfig,
  type LocalDateTime,
  type Progress,
} from '@/domain';

import { t } from '../../i18n/pt-BR';
import { useEngineConfig } from '../../queries/useEngineConfig';
import { useOverview } from '../../queries/useOverview';
import { useProgress } from '../../queries/useProgress';
import { usePreferences } from '../../state/preferencesStore';
import { AppText, Sky, tokens } from '../../ui';

import { DayHeader } from './components/DayHeader';
import { DayHero } from './components/DayHero';
import { DayNotFound } from './components/DayNotFound';
import { dayScreenState } from './dayScreenState';
import { useDayActions, type DayActionsResult } from './useDayActions';

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
  readonly actions: DayActionsResult;
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

type BodyProps = {
  readonly ready: boolean;
  readonly city: City | null;
  readonly snapshot: OverviewSnapshot | null;
  readonly config: EngineConfig | undefined;
  readonly progress: Progress | undefined;
  readonly today: string | null;
  readonly isToday: boolean;
  readonly activity: ActivityId;
  readonly date: string;
  readonly day: DayRecommendation | null;
  readonly actions: DayActionsResult;
  readonly onBack: () => void;
};

/** Só renderiza o conteúdo quando previsão, config e progresso já carregaram e o dia não é hoje
 * (hoje é redirecionado para a Home antes de chegar aqui). */
function DayScreenBody(props: BodyProps) {
  const {
    ready,
    city,
    snapshot,
    config,
    progress,
    today,
    isToday,
    activity,
    date,
    day,
    actions,
    onBack,
  } = props;
  if (!ready || !city || !snapshot || !config || !progress || !today || isToday) {
    return <AppText variant="small">{t.home.loading}</AppText>;
  }
  return (
    <DayContent
      city={city}
      activity={activity}
      date={date}
      today={today}
      tomorrow={addDays(today, 1)}
      day={day}
      now={snapshot.now}
      config={config}
      progress={progress}
      actions={actions}
      onBack={onBack}
    />
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

  const { day, phase, ready } = dayScreenState({
    city,
    snapshot: overview.snapshot,
    config: config.data,
    progress: progress.data,
    date,
    isToday,
  });

  return (
    <Sky phase={phase}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <DayScreenBody
            ready={ready}
            city={city}
            snapshot={overview.snapshot}
            config={config.data}
            progress={progress.data}
            today={today}
            isToday={isToday}
            activity={activity}
            date={date}
            day={day}
            actions={actions}
            onBack={() => router.back()}
          />
        </ScrollView>
      </SafeAreaView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { padding: tokens.space[4], gap: tokens.space[3] },
});
