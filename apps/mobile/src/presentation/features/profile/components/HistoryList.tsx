import { StyleSheet, View } from 'react-native';

import type { ActivityRecord, EngineConfig } from '@/domain';

import { formatLongDate, monthTitle } from '../../../i18n/dates';
import { t } from '../../../i18n/pt-BR';
import { AppText, Emoji, tokens } from '../../../ui';
import { buildHistory, type HistoryEntry } from '../historyStory';

type Props = {
  readonly records: readonly ActivityRecord[];
  /** Config carregada pela tela: nome e emoji da atividade saem dela, não do padrão estático. */
  readonly config: EngineConfig;
};

const MAX_ROWS = 20;
const MONTH_PARTS = 2;
const pad = (n: number): string => String(n).padStart(2, '0');

const titleOfMonth = (month: string): string => {
  const [year, m] = month.split('-').map(Number);
  if (year === undefined || m === undefined) return month;
  return monthTitle(year, m);
};

/** As notas do registro em texto corrido: é isso que transforma a linha num fato, não num dado. */
function notesLine(entry: HistoryEntry): string {
  const { record, notes } = entry;
  return notes
    .map((note) =>
      note === 'streak' ? t.profile.historyStreak(record.streakDays) : t.profile.historyNotes[note],
    )
    .join(' · ');
}

function HistoryRow({
  entry,
  config,
}: {
  readonly entry: HistoryEntry;
  readonly config: EngineConfig;
}) {
  const { record } = entry;
  const activity = config.activities[record.activity];
  const line = notesLine(entry);
  return (
    <View
      accessible
      accessibilityLabel={t.profile.historyAria(
        activity.name,
        formatLongDate(record.date),
        record.xp.total,
      )}
      style={styles.row}
    >
      <Emoji symbol={activity.emoji} label={activity.name} />
      <View style={styles.middle}>
        <AppText variant="small" weight="700">
          {`${activity.name} · ${record.hourLeft}h${pad(record.minuteLeft)}`}
        </AppText>
        {line ? (
          <AppText variant="micro" tone="muted">
            {line}
          </AppText>
        ) : null}
      </View>
      <View style={styles.right}>
        <AppText variant="small" weight="800" style={styles.xp}>
          {t.home.xpEarned(record.xp.total)}
        </AppText>
        <AppText variant="micro" tone="muted">
          {String(Number(record.date.slice(-MONTH_PARTS)))}
        </AppText>
      </View>
    </View>
  );
}

/**
 * Histórico agrupado por mês, com o que cada saída teve de notável. Uma lista de linhas iguais com
 * data e XP é um extrato; o que conta uma história é o mês como capítulo e o destaque de cada dia.
 */
export function HistoryList({ records, config }: Props) {
  const sections = buildHistory({
    records,
    greatThreshold: config.scores.great,
    max: MAX_ROWS,
  });

  if (sections.length === 0) {
    return (
      <AppText variant="small" tone="muted">
        {t.profile.empty}
      </AppText>
    );
  }

  return (
    <View style={styles.list}>
      {sections.map((section) => (
        <View key={section.month} style={styles.section}>
          <AppText variant="kicker">{titleOfMonth(section.month)}</AppText>
          {section.entries.map((entry) => (
            <HistoryRow key={entry.record.id} entry={entry} config={config} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.space[4] },
  section: { gap: tokens.space[2] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[2],
    // Régua em vez de cartão: vinte cartões arredondados seguidos achatam a hierarquia e não
    // separam nada, porque tudo ali é do mesmo tipo.
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.color.border,
  },
  middle: { flex: 1, gap: tokens.space[1] },
  right: { alignItems: 'flex-end' },
  xp: { color: tokens.color.gold },
});
