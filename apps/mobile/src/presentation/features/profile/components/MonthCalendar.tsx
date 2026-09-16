import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { AppText, tokens } from '../../../ui';
import type { MonthCell, MonthCellState, MonthGrid } from '../monthGrid';

type Props = {
  readonly grid: MonthGrid;
};

const BG_BY_STATE: Record<MonthCellState, string> = {
  done: tokens.color.mint,
  todayDone: tokens.color.mint,
  today: tokens.color.gold,
  rest: tokens.color.surface,
  future: tokens.color.surface,
  none: tokens.color.surface,
};

const TEXT_BY_STATE: Record<MonthCellState, string> = {
  done: tokens.color.mintInk,
  todayDone: tokens.color.mintInk,
  today: tokens.color.goldInk,
  rest: tokens.color.textMuted,
  future: tokens.color.textMuted,
  none: tokens.color.text,
};

function DayCell({ cell }: { readonly cell: MonthCell }) {
  return (
    <View
      accessible
      accessibilityLabel={`${cell.day}: ${t.streak.state[cell.state]}`}
      style={[
        styles.cell,
        { backgroundColor: BG_BY_STATE[cell.state] },
        cell.state === 'rest' ? styles.restBorder : null,
        // Sem este anel, cumprir a atividade apagava a marca de "hoje": a célula virava
        // indistinguível de qualquer outro dia já cumprido do mês.
        cell.state === 'today' || cell.state === 'todayDone' ? styles.todayRing : null,
      ]}
    >
      <AppText variant="micro" weight="700" style={{ color: TEXT_BY_STATE[cell.state] }}>
        {cell.day}
      </AppText>
    </View>
  );
}

function Legend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, { backgroundColor: tokens.color.mint }]} />
        <AppText variant="small" tone="muted">
          {t.profile.calendarLegendActive}
        </AppText>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendDot, styles.restBorder]} />
        <AppText variant="small" tone="muted">
          {t.profile.calendarLegendRest}
        </AppText>
      </View>
    </View>
  );
}

/** Calendário do mês (7 colunas, segunda a domingo) com legenda — mockup `.cal`. */
export function MonthCalendar({ grid }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {grid.weekdays.map((day) => (
          <AppText key={day} variant="micro" tone="muted" style={styles.headerCell}>
            {day}
          </AppText>
        ))}
      </View>
      <View style={styles.grid}>
        {grid.cells.map((cell, index) =>
          cell === null ? (
            <View key={`pad-${index}`} style={styles.cell} />
          ) : (
            <DayCell key={cell.date} cell={cell} />
          ),
        )}
      </View>
      <Legend />
    </View>
  );
}

const CELL_WIDTH = `${100 / 7}%` as const;

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2] },
  row: { flexDirection: 'row' },
  headerCell: { width: CELL_WIDTH, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: tokens.space[1] },
  cell: {
    width: CELL_WIDTH,
    aspectRatio: 1,
    borderRadius: tokens.radius.cell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restBorder: { borderWidth: 1, borderColor: tokens.color.border, borderStyle: 'dashed' },
  todayRing: { borderWidth: 2, borderColor: tokens.color.gold },
  legend: { flexDirection: 'row', gap: tokens.space[3] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  legendDot: {
    width: tokens.space[2],
    height: tokens.space[2],
    borderRadius: tokens.radius.pill,
  },
});
