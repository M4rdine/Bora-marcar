import { StyleSheet, View } from 'react-native';

import type { ActivityRecord, EngineConfig } from '@/domain';

import { formatDayTitle } from '../../../i18n/dates';
import { t } from '../../../i18n/pt-BR';
import { AppText, Emoji, Pill, Surface, tokens } from '../../../ui';

type Props = {
  readonly records: readonly ActivityRecord[];
  readonly today: string;
  readonly tomorrow: string;
  /** Config carregada pela tela: nome e emoji da atividade saem dela, não do padrão estático. */
  readonly config: EngineConfig;
};

const MAX_ROWS = 20;
const pad = (n: number): string => String(n).padStart(2, '0');

type RowProps = {
  readonly record: ActivityRecord;
  readonly today: string;
  readonly tomorrow: string;
  readonly config: EngineConfig;
};

function HistoryRow({ record, today, tomorrow, config }: RowProps) {
  const activity = config.activities[record.activity];
  return (
    <Surface padding={2} style={styles.row}>
      <Emoji symbol={activity.emoji} label={activity.name} />
      <View style={styles.middle}>
        <AppText variant="small" weight="700">
          {`${activity.name} · ${record.hourLeft}h${pad(record.minuteLeft)}`}
        </AppText>
        <AppText variant="micro" tone="muted">
          {formatDayTitle(record.date, today, tomorrow)}
        </AppText>
        {record.planFulfilled ? <Pill label={t.profile.planFulfilled} tone="neutral" /> : null}
      </View>
      <AppText variant="small" weight="800" style={styles.xp}>
        {t.home.xpEarned(record.xp.total)}
      </AppText>
    </Surface>
  );
}

/** Últimos 20 registros, mais recente primeiro — mockup `.hist`. */
export function HistoryList({ records, today, tomorrow, config }: Props) {
  if (records.length === 0) {
    return (
      <AppText variant="small" tone="muted">
        {t.profile.empty}
      </AppText>
    );
  }
  const recent = [...records].reverse().slice(0, MAX_ROWS);
  return (
    <View style={styles.list}>
      {recent.map((record) => (
        <HistoryRow
          key={record.id}
          record={record}
          today={today}
          tomorrow={tomorrow}
          config={config}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  middle: { flex: 1, gap: tokens.space[1] },
  xp: { color: tokens.color.gold },
});
