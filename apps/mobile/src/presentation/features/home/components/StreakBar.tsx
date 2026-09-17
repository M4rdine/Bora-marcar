import { StyleSheet, View } from 'react-native';

import { weekdayLong } from '../../../i18n/dates';
import { t } from '../../../i18n/pt-BR';
import { AppText, Icon, Surface, tokens } from '../../../ui';
import { splitMinutes, type StreakRisk } from '../streakRisk';
import type { WeekDayState, WeekStripDay } from '../weekStrip';

type Props = {
  readonly risk: StreakRisk;
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
        day.state === 'today' || day.state === 'todayDone' ? styles.todayBorder : null,
        day.state === 'rest' ? styles.restBorder : null,
      ]}
    >
      <AppText variant="micro" weight="700" style={{ color: TEXT_BY_STATE[day.state] }}>
        {day.label.charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}

/**
 * O número grande é a sequência; a linha abaixo dele diz o que está em jogo. Um contador que só
 * informa quantos dias você tem não dá motivo para voltar amanhã — o que dá é ver o que se perde.
 */
function RiskHeadline({ risk }: { readonly risk: StreakRisk }) {
  if (risk.kind === 'idle') {
    return (
      <View style={styles.headline}>
        <AppText variant="subtitle" weight="700">
          {t.streak.risk.idleTitle}
        </AppText>
        <AppText variant="small" tone="muted">
          {t.streak.risk.idleBody}
        </AppText>
      </View>
    );
  }

  const { hours, minutes } = risk.kind === 'atRisk' ? splitMinutes(risk.minutesLeft) : ZERO;
  return (
    <View style={styles.headline}>
      <View style={styles.countRow}>
        <View style={risk.kind === 'atRisk' ? styles.flameAtRisk : undefined}>
          <Icon name="flame" size={FLAME_SIZE} label={t.streak.days(risk.streak)} />
        </View>
        <AppText variant="display" style={styles.count}>
          {String(risk.streak)}
        </AppText>
        <AppText variant="small" tone="muted" style={styles.unit}>
          {t.streak.days(risk.streak)}
        </AppText>
      </View>
      {risk.kind === 'atRisk' ? (
        <View
          accessible
          accessibilityLabel={t.streak.risk.countdownAria(hours, minutes)}
          style={styles.countdownRow}
        >
          <AppText variant="small" weight="700" style={styles.atRiskText}>
            {t.streak.risk.atRiskTitle(risk.streak)}
          </AppText>
          <AppText variant="subtitle" weight="800" style={styles.atRiskText}>
            {t.streak.risk.countdown(hours, minutes)}
          </AppText>
        </View>
      ) : null}
      {risk.kind === 'secured' ? (
        <AppText variant="small" weight="700" style={styles.securedText}>
          {t.streak.risk.securedTitle}
        </AppText>
      ) : null}
      {risk.kind === 'protected' ? (
        <>
          <AppText variant="small" weight="700">
            {t.streak.risk.protectedTitle}
          </AppText>
          <AppText variant="small" tone="muted">
            {t.streak.risk.protectedBody}
          </AppText>
        </>
      ) : null}
    </View>
  );
}

export function StreakBar({ risk, days }: Props) {
  return (
    <Surface accessibilityLabel="sequência" strength="soft" radius="card" padding={4} gap={3}>
      <RiskHeadline risk={risk} />
      <View style={styles.squares}>
        {days.map((day) => (
          <DaySquare key={day.date} day={day} />
        ))}
      </View>
    </Surface>
  );
}

const ZERO = { hours: 0, minutes: 0 };
const SQUARE = tokens.size.streakSquare;
const FLAME_SIZE = 28;
const FLAME_DIM_OPACITY = 0.55;

const styles = StyleSheet.create({
  headline: { gap: tokens.space[1] },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[2] },
  count: { lineHeight: tokens.font.display },
  unit: { flex: 1 },
  // Fogo apagado quando a sequência está em risco: a cor diz o que a frase repete.
  flameAtRisk: { opacity: FLAME_DIM_OPACITY },
  countdownRow: { gap: tokens.space[1] },
  atRiskText: { color: tokens.color.gold },
  securedText: { color: tokens.color.mint },
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
