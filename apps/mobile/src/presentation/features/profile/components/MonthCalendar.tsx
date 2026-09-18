import { StyleSheet, View } from 'react-native';

import { t } from '../../../i18n/pt-BR';
import { AppText, Icon, tokens } from '../../../ui';
import { weeksOf, type MonthCell, type MonthCellState, type MonthGrid } from '../monthGrid';

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
      {/* O fogo marca o dia de hoje já cumprido: é a recompensa visual de ter mantido a sequência,
          no lugar onde a pessoa vai procurar por ela. Ele toma a MESMA tinta do número — a célula
          cumprida é verde-menta, e um desenho branco nela some. O emoji antigo trazia cor própria
          e escondia essa dependência. */}
      {cell.state === 'todayDone' ? (
        <Icon
          name="flame"
          size={FLAME_SIZE}
          color={TEXT_BY_STATE[cell.state]}
          label={t.streak.state.todayDone}
        />
      ) : null}
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
      {weeksOf(grid.cells).map((week, semana) => (
        <View key={semana} style={styles.week}>
          {week.map((cell, index) =>
            cell === null ? (
              <View key={`vazio-${semana}-${index}`} style={styles.cell} />
            ) : (
              <DayCell key={cell.date} cell={cell} />
            ),
          )}
        </View>
      ))}
      <Legend />
    </View>
  );
}

const FLAME_SIZE = 12;
/**
 * Respiro entre as colunas. Sem ele as células encostavam, e dois cantos arredondados colados
 * desenham um entalhe entre os dias — o calendário virava uma faixa contínua recortada.
 */
const COLUMN_GAP = tokens.space[1];
/**
 * TODA célula reserva a mesma borda, transparente quando não há o que marcar.
 *
 * Com `aspectRatio`, o Yoga soma a borda à altura: quando só o dia de hoje tinha `borderWidth`, a
 * célula dele saía quatro pontos mais alta que as vizinhas e entortava a linha inteira. Reservar
 * a borda em todas iguala a geometria, e só a cor muda.
 */
const CELL_BORDER = 2;

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2] },
  row: { flexDirection: 'row', columnGap: COLUMN_GAP },
  // `flex: 1` divide a linha em sete partes iguais DEPOIS de descontar os vãos. A largura em
  // porcentagem que havia aqui antes não descontava nada e ainda arredondava diferente conforme
  // a densidade da tela, o que estourava a linha no aparelho e não na web.
  headerCell: { flex: 1, textAlign: 'center' },
  week: { flexDirection: 'row', columnGap: COLUMN_GAP, marginTop: tokens.space[1] },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: tokens.radius.cell,
    borderWidth: CELL_BORDER,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restBorder: { borderColor: tokens.color.border, borderStyle: 'dashed' },
  todayRing: { borderColor: tokens.color.gold },
  legend: { flexDirection: 'row', gap: tokens.space[3] },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  legendDot: {
    width: tokens.space[2],
    height: tokens.space[2],
    borderRadius: tokens.radius.pill,
  },
});
