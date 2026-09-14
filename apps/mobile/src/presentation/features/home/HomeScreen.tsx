import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ProviderErrorCode } from '@/application/ports';

import { t } from '../../i18n/pt-BR';
import { useEngineConfig } from '../../queries/useEngineConfig';
import { useGamificationActions } from '../../queries/useGamificationActions';
import { useOverview } from '../../queries/useOverview';
import { useProgress } from '../../queries/useProgress';
import { useServices } from '../../services/ServicesProvider';
import { usePreferences } from '../../state/preferencesStore';

import { ActivityPicker } from './components/ActivityPicker';
import { HeroCard } from './components/HeroCard';
import { HourlyList } from './components/HourlyList';
import { NextDaysList } from './components/NextDaysList';
import { deriveHeroState, type HeroState } from './heroState';
import { useBadWeatherRecorder } from './useBadWeatherRecorder';

type ActionErrorCode = 'alreadyDoneToday' | 'alreadyPlanned' | 'planNotFound' | 'alreadyConfirmed';
const isActionError = (e: unknown): e is { code: ActionErrorCode } =>
  typeof e === 'object' &&
  e !== null &&
  'code' in e &&
  typeof (e as { code: unknown }).code === 'string';

/** Único plano que o herói ainda permite desfazer: o planejado ou o que expirou sem registro. */
const cancellablePlanId = (state: HeroState): string | null => {
  if (state.kind === 'planned') return state.plan.planId;
  if (state.kind === 'logNoPlan') return state.expiredPlan?.planId ?? null;
  return null;
};

function Welcome() {
  const router = useRouter();
  const services = useServices();
  const selectCity = usePreferences((s) => s.selectCity);
  const [error, setError] = useState<string | null>(null);
  const resolveLocation = async () => {
    const r = await services.resolveMyLocation();
    if (r.ok) selectCity(r.value);
    else setError(t.errors[r.error.code]);
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.home.welcomeTitle}</Text>
      <Text>{t.home.welcomeBody}</Text>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => router.push('/cities')}
      >
        <Text style={styles.buttonText}>{t.home.searchCity}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={styles.button}
        onPress={() => void resolveLocation()}
      >
        <Text style={styles.buttonText}>{t.home.useLocation}</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function HomeScreen() {
  const city = usePreferences((s) => s.city);
  const activity = usePreferences((s) => s.activity);
  const selectActivity = usePreferences((s) => s.selectActivity);
  const router = useRouter();
  const config = useEngineConfig();
  const overview = useOverview(city, activity);
  const today = overview.snapshot?.overview.today ?? null;
  const progress = useProgress(overview.snapshot?.now.date ?? null);
  const actions = useGamificationActions();
  const [actionError, setActionError] = useState<string | null>(null);
  // `fairThreshold` fica nulo enquanto a config não carregou; o hook (que não pode ser
  // condicional) simplesmente não dispara nesse intervalo.
  useBadWeatherRecorder(city?.id ?? null, today, config.data?.scores.fair ?? null);

  if (city === null) return <Welcome />;
  if (!config.data) return <Text style={styles.container}>{t.home.loading}</Text>;

  const run = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(isActionError(e) ? t.errors[e.code] : t.errors.network);
    }
  };

  const snapshot = overview.snapshot;
  const hero =
    snapshot && progress.data
      ? deriveHeroState({
          today: snapshot.overview.today,
          now: snapshot.now,
          progress: progress.data,
          graceHours: config.data.window.graceHoursAfterEnd,
          fairThreshold: config.data.scores.fair,
        })
      : null;
  const busy =
    actions.plan.isPending ||
    actions.confirm.isPending ||
    actions.log.isPending ||
    actions.cancel.isPending;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/cities')}>
        <Text style={styles.title}>{`${city.name}${city.admin1 ? `, ${city.admin1}` : ''}`}</Text>
      </Pressable>
      <ActivityPicker config={config.data} selected={activity} onSelect={selectActivity} />

      {overview.status === 'error' && overview.error ? (
        <View>
          <Text style={styles.error}>{t.errors[overview.error.code as ProviderErrorCode]}</Text>
          <Pressable accessibilityRole="button" style={styles.button} onPress={overview.refetch}>
            <Text style={styles.buttonText}>{t.home.retry}</Text>
          </Pressable>
        </View>
      ) : null}
      {overview.status === 'loading' ? <Text>{t.home.loading}</Text> : null}

      {snapshot && hero ? (
        <>
          <HeroCard
            state={hero}
            config={config.data}
            busy={busy}
            errorMessage={actionError}
            onPlan={() =>
              hero.kind === 'plan' &&
              void run(() =>
                actions.plan.mutateAsync({
                  city,
                  activity,
                  window: hero.window,
                  windowScore: hero.score,
                  utcOffsetSeconds: snapshot.now.utcOffsetSeconds,
                }),
              )
            }
            onCancel={() => {
              const planId = cancellablePlanId(hero);
              if (planId !== null) void run(() => actions.cancel.mutateAsync(planId));
            }}
            onConfirm={() =>
              hero.kind === 'confirm' &&
              void run(() =>
                actions.confirm.mutateAsync({
                  planId: hero.plan.planId,
                  date: snapshot.now.date,
                  hourLeft: snapshot.now.hour,
                  hourScore: hero.nowScore ?? 0,
                }),
              )
            }
            onLogNow={() =>
              void run(() =>
                actions.log.mutateAsync({
                  city,
                  activity,
                  date: snapshot.now.date,
                  hourLeft: snapshot.now.hour,
                  hourScore: snapshot.overview.now?.score ?? 0,
                }),
              )
            }
          />
          <HourlyList hours={snapshot.overview.today.hours} nowHour={snapshot.now.hour} />
          <NextDaysList
            days={snapshot.overview.nextDays}
            comparison={snapshot.overview.comparison}
            bestDate={snapshot.overview.bestDate}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  button: { padding: 12, borderRadius: 12, backgroundColor: '#333', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#b00020' },
});
