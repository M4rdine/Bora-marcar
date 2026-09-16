import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { City } from '@/application/ports';
import type { OverviewSnapshot } from '@/application/useCases/buildOverview';
import { addDays, recommendDay, type ActivityId, type EngineConfig, type Progress } from '@/domain';

import { buildHourlySequence, HourlyChronology } from '../../chronology';
import { t } from '../../i18n/pt-BR';
import { useEngineConfig } from '../../queries/useEngineConfig';
import { useOverview, type OverviewState } from '../../queries/useOverview';
import { useProgress } from '../../queries/useProgress';
import { usePreferences } from '../../state/preferencesStore';
import { AppText, Button, phaseFor, Sky, tokens, useScreenPaddingBottom } from '../../ui';

import { ActivityPicker } from './components/ActivityPicker';
import { HeroCard } from './components/HeroCard';
import { HomeHeader } from './components/HomeHeader';
import { NextDaysList } from './components/NextDaysList';
import { StreakBar } from './components/StreakBar';
import { Welcome } from './components/Welcome';
import { deriveHeroState } from './heroState';
import { useBadWeatherRecorder } from './useBadWeatherRecorder';
import { useHeroActions } from './useHeroActions';
import { weekStrip } from './weekStrip';

function OverviewStatus({ overview }: { readonly overview: OverviewState }) {
  if (overview.status === 'error' && overview.error) {
    return (
      <View style={styles.status}>
        <AppText variant="small">{t.errors[overview.error.code]}</AppText>
        <Button label={t.home.retry} kind="quiet" onPress={overview.refetch} />
      </View>
    );
  }
  if (overview.status === 'loading') return <AppText variant="small">{t.home.loading}</AppText>;
  return null;
}

type HeroSectionProps = {
  readonly city: City;
  readonly activity: ActivityId;
  readonly config: EngineConfig;
  readonly snapshot: OverviewSnapshot;
  readonly progress: Progress;
  readonly onOpenDay: (date: string) => void;
};

/**
 * Só monta quando previsão e progresso já carregaram, então `useHeroActions` pode ser chamado
 * incondicionalmente a cada renderização deste componente sem violar as regras de hooks.
 */
function HeroSection({ city, activity, config, snapshot, progress, onOpenDay }: HeroSectionProps) {
  const tomorrowDate = addDays(snapshot.now.date, 1);
  const tomorrow = snapshot.overview.nextDays.find((d) => d.date === tomorrowDate) ?? null;
  const hero = deriveHeroState({
    today: snapshot.overview.today,
    now: snapshot.now,
    progress,
    graceHours: config.window.graceHoursAfterEnd,
    fairThreshold: config.scores.fair,
  });
  const actions = useHeroActions({ city, activity, snapshot, hero });
  const unlockedToday = progress.badges.filter((b) => b.unlockedOn === snapshot.now.date);
  return (
    <>
      <HeroCard
        state={hero}
        config={config}
        cityId={city.id}
        now={snapshot.now}
        hours={snapshot.overview.today.hours}
        tomorrow={tomorrow}
        level={progress.level}
        actions={actions}
        unlockedToday={unlockedToday}
        onOpenTomorrow={() => onOpenDay(tomorrowDate)}
      />
      <HourlyChronology
        sequence={buildHourlySequence({
          today: snapshot.overview.today,
          tomorrow,
          now: snapshot.now,
        })}
        profile={config.activities[activity]}
        onPlanHour={
          actions.canPlanAt
            ? (item) =>
                actions.onPlanAt(
                  {
                    date: item.hour.hour.date,
                    startHour: item.hour.hour.hour,
                    endHour: item.hour.hour.hour + 1,
                  },
                  item.hour.score,
                )
            : null
        }
      />
      <NextDaysList
        days={snapshot.overview.nextDays}
        comparison={snapshot.overview.comparison}
        bestDate={snapshot.overview.bestDate}
        today={snapshot.now.date}
        tomorrow={tomorrowDate}
        onOpenDay={onOpenDay}
      />
    </>
  );
}

/** Score da atividade ATIVA na melhor janela de hoje; inativas não recebem score (ver ActivityPicker). */
function useActiveScore(overview: OverviewState, config: EngineConfig) {
  const now = overview.snapshot?.now ?? null;
  const forecast = overview.forecast;
  return useMemo(() => {
    if (!forecast || !now) return undefined;
    return (id: ActivityId) =>
      recommendDay(forecast, config.activities[id], config, { date: now.date, now }).score;
  }, [forecast, config, now]);
}

type ContentProps = {
  readonly city: City;
  readonly config: EngineConfig;
  readonly overview: OverviewState;
  readonly progress: Progress | undefined;
};

function HomeContent({ city, config, overview, progress }: ContentProps) {
  const router = useRouter();
  const activity = usePreferences((s) => s.activity);
  const selectActivity = usePreferences((s) => s.selectActivity);
  const now = overview.snapshot?.now ?? null;
  const scoreFor = useActiveScore(overview, config);
  return (
    <>
      {progress && now ? (
        <>
          <HomeHeader
            city={city}
            now={now}
            level={progress.level}
            onOpenCities={() => router.push('/cities')}
          />
          <StreakBar
            streak={progress.streak}
            days={weekStrip({
              today: now.date,
              activeDates: progress.activeDates,
              restDates: progress.restDates,
            })}
          />
        </>
      ) : null}
      <ActivityPicker
        config={config}
        selected={activity}
        onSelect={selectActivity}
        scoreFor={scoreFor}
      />
      <OverviewStatus overview={overview} />
      {overview.snapshot && progress ? (
        <HeroSection
          city={city}
          activity={activity}
          config={config}
          snapshot={overview.snapshot}
          progress={progress}
          onOpenDay={(date) => router.push({ pathname: '/day/[date]', params: { date } })}
        />
      ) : null}
    </>
  );
}

export function HomeScreen() {
  const city = usePreferences((s) => s.city);
  const activity = usePreferences((s) => s.activity);
  const paddingBottom = useScreenPaddingBottom();
  const config = useEngineConfig();
  const overview = useOverview(city, activity);
  const today = overview.snapshot?.overview.today ?? null;
  const progress = useProgress(overview.snapshot?.now.date ?? null);
  // `fairThreshold` fica nulo enquanto a config não carregou; o hook (que não pode ser
  // condicional) simplesmente não dispara nesse intervalo.
  useBadWeatherRecorder(city?.id ?? null, today, config.data?.scores.fair ?? null);
  const isBadDay =
    today !== null &&
    today.bestScoreOfDay !== null &&
    config.data !== undefined &&
    today.bestScoreOfDay < config.data.scores.fair;
  const phase = overview.snapshot
    ? phaseFor({ now: overview.snapshot.now, daily: today?.daily ?? null, isBadDay })
    : 'day';

  if (city === null) {
    return (
      <Sky phase="dusk">
        <SafeAreaView style={styles.safe}>
          <Welcome />
        </SafeAreaView>
      </Sky>
    );
  }

  return (
    <Sky phase={phase}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom }]}>
          {config.data ? (
            <HomeContent
              city={city}
              config={config.data}
              overview={overview}
              progress={progress.data}
            />
          ) : (
            <AppText>{t.home.loading}</AppText>
          )}
        </ScrollView>
      </SafeAreaView>
    </Sky>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  status: { gap: tokens.space[2] },
});
