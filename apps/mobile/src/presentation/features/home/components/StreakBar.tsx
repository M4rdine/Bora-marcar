import { StyleSheet, View } from 'react-native';

import { weekdayLong } from '../../../i18n/dates';
import { t } from '../../../i18n/pt-BR';
import { AppText, Emoji, Surface, tokens } from '../../../ui';
import type { WeekDayState, WeekStripDay } from '../weekStrip';

type Props = {
  readonly streak: number;
  readonly days: readonly WeekStripDay[];
};

const BG_BY_STATE: Record<WeekDayState, string> = {
  done: tokens.color.mint,
  todayDone: tokens.color.mint,
  today: tokens.color.gold,
  rest: tokens.color.surface,
  future: tokens.color.surface,
  none: tokens.color.surface,
};

const TEXT_BY_STATE: Record<WeekDayState, string> = {
  done: tokens.color.mintInk,
  todayDone: tokens.color.mintInk,
  today: tokens.color.goldInk,
  rest: tokens.color.textMuted,
  future: tokens.color.textMuted,
  none: tokens.color.textMuted,
};

function DaySquare({ day }: { readonly day: WeekStripDay }) {
  return (
    <View
      accessible
      accessibilityLabel={`${weekdayLong(day.date)}: ${t.streak.state[day.state]}`}
      style={[
        styles.square,
        { backgroundColor: BG_BY_STATE[day.state] },
        day.state === 'today' ? styles.todayBorder : null,
        day.state === 'rest' ? styles.restBorder : null,
      ]}
    >
      <AppText variant="micro" weight="700" style={{ color: TEXT_BY_STATE[day.state] }}>
        {day.label.charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}

export function StreakBar({ streak, days }: Props) {
  return (
    <Surface strength="soft" radius="card" padding={3} style={styles.row}>
      <View style={styles.left}>
        <Emoji symbol="🔥" label={t.streak.days(streak)} />
        <AppText variant="small" weight="700">
          {t.streak.days(streak)}
        </AppText>
      </View>
      <View style={styles.squares}>
        {days.map((day) => (
          <DaySquare key={day.date} day={day} />
        ))}
      </View>
    </Surface>
  );
}

const SQUARE = tokens.size.streakSquare;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  squares: { flexDirection: 'row', gap: tokens.space[1] },
  square: {
    width: SQUARE,
    height: SQUARE,
    borderRadius: tokens.radius.cell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBorder: { borderWidth: 2, borderColor: tokens.color.accent },
  restBorder: { borderWidth: 1, borderColor: tokens.color.border, borderStyle: 'dashed' },
});
