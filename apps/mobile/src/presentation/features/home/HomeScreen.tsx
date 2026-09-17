import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { City } from '@/application/ports';
import type { OverviewSnapshot } from '@/application/useCases/buildOverview';
import { addDays, recommendDay, type ActivityId, type EngineConfig, type Progress } from '@/domain';

import { buildHourlySequence, HourlyChronology } from '../../chronology';
import { useAmbientPhase } from '../../hooks/useAmbientPhase';
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
import { deriveStreakRisk } from './streakRisk';
import { useBadWeatherRecorder } from './useBadWeatherRecorder';
import { useHeroActions } from './useHeroActions';
import { useRevealReward } from './useRevealReward';
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
  readonly scrollRef: RefObject<ScrollView | null>;
  readonly visibleHeight: number;
  readonly reservedBottom: number;
  readonly onOpenDay: (date: string) => void;
};

/**
 * Só monta quando previsão e progresso já carregaram, então `useHeroActions` pode ser chamado
 * incondicionalmente a cada renderização deste componente sem violar as regras de hooks.
 */
function HeroSection({
  city,
  activity,
  config,
  snapshot,
  progress,
  scrollRef,
  visibleHeight,
  reservedBottom,
  onOpenDay,
}: HeroSectionProps) {
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
  const badgeTotals = {
    unlocked: progress.badges.filter((b) => b.unlocked).length,
    total: progress.badges.length,
  };
  // A recompensa nasce no fim do cartão do herói, e a barra de abas flutua sobre o fim da tela:
  // sem enquadrar, o botão seguinte fica 83% coberto pela barra. O enquadramento em si mora em
  // `useRevealReward`, que espera a medida tirada com a conquista já na tela.
  const reveal = useRevealReward({
    rewardKey: hero.kind === 'done' && unlockedToday.length > 0 ? unlockedToday[0]!.id : null,
    scrollRef,
    visibleHeight,
    reservedBottom,
  });
  return (
    <>
      <View onLayout={reveal.onLayout}>
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
          badgeTotals={badgeTotals}
          onOpenTomorrow={() => onOpenDay(tomorrowDate)}
        />
      </View>
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
  readonly scrollRef: RefObject<ScrollView | null>;
  readonly visibleHeight: number;
  readonly reservedBottom: number;
};

function HomeContent({
  city,
  config,
  overview,
  progress,
  scrollRef,
  visibleHeight,
  reservedBottom,
}: ContentProps) {
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
            risk={deriveStreakRisk({
              streak: progress.streak,
              doneToday: progress.todayRecord !== null,
              restToday: progress.restDates.has(now.date),
              now,
            })}
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
          scrollRef={scrollRef}
          visibleHeight={visibleHeight}
          reservedBottom={reservedBottom}
          onOpenDay={(date) => router.push({ pathname: '/day/[date]', params: { date } })}
        />
      ) : null}
    </>
  );
}

export function HomeScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [visibleHeight, setVisibleHeight] = useState(0);
  // Fase de reserva: vale no primeiro acesso e enquanto a previsão carrega. Antes eram duas
  // constantes — entardecer no onboarding e dia no carregamento — e ambas contradiziam o relógio:
  // quem abria às 23h via um pôr do sol em chamas e caía numa tela quase preta.
  const ambient = useAmbientPhase();
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
    : ambient;

  if (city === null) {
    return (
      <Sky phase={ambient}>
        <SafeAreaView style={styles.safe}>
          <Welcome />
        </SafeAreaView>
      </Sky>
    );
  }

  return (
    <Sky phase={phase}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          ref={scrollRef}
          onLayout={(e) => setVisibleHeight(e.nativeEvent.layout.height)}
          contentContainerStyle={[styles.container, { paddingBottom }]}
        >
          {config.data ? (
            <HomeContent
              city={city}
              config={config.data}
              overview={overview}
              progress={progress.data}
              scrollRef={scrollRef}
              visibleHeight={visibleHeight}
              reservedBottom={paddingBottom}
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
