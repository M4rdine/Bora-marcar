import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { EngineConfig, Progress } from '@/domain';

import { useAmbientPhase } from '../../hooks/useAmbientPhase';
import { useToday } from '../../hooks/useToday';
import { formatLongDate } from '../../i18n/dates';
import { t } from '../../i18n/pt-BR';
import { useEngineConfig } from '../../queries/useEngineConfig';
import { useProgress } from '../../queries/useProgress';
import { AppText, SectionHeader, Sky, tokens, useScreenPaddingBottom } from '../../ui';

import { BadgeGrid } from './components/BadgeGrid';
import { DevReset } from './components/DevReset';
import { HistoryList } from './components/HistoryList';
import { LevelCard } from './components/LevelCard';
import { MonthCalendar } from './components/MonthCalendar';
import { NextBadgeCard } from './components/NextBadgeCard';
import { ProfileEmpty } from './components/ProfileEmpty';
import { StatsRow } from './components/StatsRow';
import { monthGrid } from './monthGrid';
import { nextBadge } from './nextBadge';

const sinceLabel = (records: Progress['records']): string => {
  const first = records[0];
  return first ? t.profile.since(formatLongDate(first.date)) : t.profile.noHistory;
};

function monthOf(date: string): { readonly year: number; readonly month: number } {
  const [y, m] = date.split('-').map(Number);
  return { year: y ?? 0, month: m ?? 1 };
}

function countInMonth(dates: ReadonlySet<string>, year: number, month: number): number {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return [...dates].filter((d) => d.startsWith(prefix)).length;
}

type ContentProps = {
  readonly progress: Progress;
  readonly today: string;
  readonly config: EngineConfig;
  readonly onStart: () => void;
};

function ProfileContent({ progress, today, config, onStart }: ContentProps) {
  // Antes da primeira saída não há painel a mostrar, só um convite. Ver o item 4 da crítica.
  if (progress.records.length === 0) return <ProfileEmpty onStart={onStart} />;

  const { year, month } = monthOf(today);
  const grid = monthGrid({
    year,
    month,
    today,
    activeDates: progress.activeDates,
    restDates: progress.restDates,
  });
  const unlocked = progress.badges.filter((b) => b.unlocked).length;
  const activeInMonth = countInMonth(progress.activeDates, year, month);
  const restInMonth = countInMonth(progress.restDates, year, month);
  const next = nextBadge(progress.badges);

  return (
    <>
      <AppText variant="title">{t.profile.title}</AppText>
      <AppText variant="small" tone="muted">
        {sinceLabel(progress.records)}
      </AppText>
      <LevelCard level={progress.level} />
      <StatsRow
        streak={progress.streak}
        activities={progress.records.length}
        unlockedBadges={progress.badges.filter((b) => b.unlocked).length}
      />
      {next ? <NextBadgeCard next={next} /> : null}
      <SectionHeader
        title={t.profile.achievements}
        aside={t.profile.badges(unlocked, progress.badges.length)}
      />
      <BadgeGrid badges={progress.badges} />
      <SectionHeader
        title={grid.title}
        aside={t.profile.monthSummary(activeInMonth, restInMonth)}
      />
      <MonthCalendar grid={grid} />
      <SectionHeader title={t.profile.history} />
      <HistoryList records={progress.records} config={config} />
      <DevReset />
    </>
  );
}

export function ProfileScreen() {
  const router = useRouter();
  const phase = useAmbientPhase();
  const { date: today } = useToday();
  const progress = useProgress(today);
  const paddingBottom = useScreenPaddingBottom();
  const config = useEngineConfig();

  return (
    <Sky phase={phase}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom }]}>
          {progress.data && config.data ? (
            <ProfileContent
              progress={progress.data}
              today={today}
              config={config.data}
              onStart={() => router.push('/')}
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
  container: {
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
});
